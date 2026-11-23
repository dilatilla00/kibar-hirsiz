// Telefona özgü iki şey: titreşim (Haptic) ve "soygun bitti" bildirimleri (Notify).
// iOS uygulamasında yerel köprüler kullanılır; tarayıcıda titreşim destekleniyorsa navigator.vibrate, bildirim yok.
(function () {
  const G = window.Game, E = G.E;
  const bridge = n => { try { return window.webkit.messageHandlers[n] || null; } catch (e) { return null; } };
  const getPref = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v === '1'; } catch (e) { return d; } };
  const setPref = (k, v) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) { /* yoksay */ } };

  // ---------- Titreşim ----------
  // Ses adına göre titreşim. Soygun sırasındaki ortam sesleri (maymuncuk, adım...) titreştirmez.
  const MAP = {
    tap: 'selection', tick: 'selection', phase: 'light', unlock: 'medium', door: 'light', coin: 'light', gem: 'light',
    good: 'success', success: 'success', reward: 'success', learn: 'success', levelup: 'success', legend: 'success',
    bad: 'warning', fail: 'warning', whistle: 'warning', alert: 'heavy', caught: 'error', break: 'rigid',
  };
  // Olay sesleri: varsayılan güçlü bir vuruş; bazılarının kendi ritmi var (köpek iki kez havlar).
  const PATTERN = {
    bark: [[0, 'soft'], [750, 'heavy'], [1150, 'heavy']],
    alarmbell: [[0, 'heavy'], [180, 'heavy'], [360, 'heavy']],
    glass: [[0, 'rigid'], [90, 'light']],
    whistle2: [[0, 'warning']],
    witness: [[0, 'warning']],
    guard: [[0, 'medium'], [400, 'medium']],
    keysguard: [[0, 'light'], [250, 'medium']],
    catvase: [[0, 'light'], [500, 'rigid']],
  };
  const eventSfx = new Set((E.events || []).map(e => e.sfx).filter(Boolean));
  const hb = bridge('haptic');
  const canVibrate = !hb && typeof navigator.vibrate === 'function';
  let hOn = getPref('gk_haptic', true);

  function pulse(kind) {
    if (hb) { hb.postMessage(kind); return; }
    if (canVibrate) navigator.vibrate({ selection: 8, light: 12, soft: 15, medium: 25, rigid: 30, heavy: 40, success: [20, 60, 20], warning: [35, 80, 35], error: [60, 60, 60, 60, 60] }[kind] || 15);
  }
  const Haptic = {
    get supported() { return !!hb || canVibrate; },
    get on() { return hOn; },
    set on(v) { hOn = !!v; setPref('gk_haptic', hOn); if (hOn) pulse('medium'); },
    play(kind, delayMs = 0) { if (!hOn || !this.supported) return; delayMs > 0 ? setTimeout(() => pulse(kind), delayMs) : pulse(kind); },
    // audio.js her ses çaldığında çağırır (delay saniye cinsinden)
    sound(name, delay = 0) {
      const d = Math.round(delay * 1000);
      const pat = PATTERN[name] || (MAP[name] ? [[0, MAP[name]]] : eventSfx.has(name) ? [[0, 'heavy']] : null);
      if (pat) pat.forEach(([ms, k]) => this.play(k, d + ms));
    },
  };
  window.Haptic = Haptic;

  // ---------- Bildirimler ----------
  // Soygun bir olayda durur ya da biter. Bir sonraki durma anı için tek bir bildirim planlanır;
  // soygun hızlandırılınca, olay seçilince ya da iş bitince plan kendiliğinden güncellenir.
  const nb = bridge('notify');
  let nOn = getPref('gk_notify', true), status = 'unknown';

  function plan() {
    const h = G.s.heist;
    if (!h || !h.start) return null;
    const st = G.heistStatus();
    if (!st || st.pending || st.done) return null;
    const t = G.targetById[h.id], el = (Date.now() - h.start) / 1000;
    const ev = (h.events || []).find(e => !e.done && e.at > el);
    if (ev) {
      const e = (E.events || []).find(x => x.id === ev.id) || {};
      return { at: h.start + ev.at * 1000, title: e.title || 'Beklenmedik bir şey oldu', body: `${t.name}: iş durdu, ne yapacağına sen karar ver.` };
    }
    return { at: h.start + st.total * 1000, title: `${t.name} işi bitti`, body: 'Ganimet seni bekliyor. Sonucu görmek için dokun.' };
  }
  // Günlük ödül hatırlatması: ödül alındıysa ertesi gün akşam 19:00'da.
  function dailyPlan() {
    if (!G.dailyState) return null;
    const d = G.dailyState();
    if (d.ready) return null; // bugünkü alınmadı: oyun açılınca zaten gösterilecek
    const now = new Date(), at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 19, 0, 0).getTime();
    const nextDay = d.streak % d.rewards.length + 1;
    return { at, title: 'Günlük ödülün hazır', body: nextDay === d.rewards.length ? '7. günün büyük ödülü seni bekliyor. Seriyi bozma!' : `${nextDay}. gün ödülünü almayı unutma. Seriyi bozma!` };
  }
  const lastBy = {};
  function post(id, p) {
    const key = p ? Math.round(p.at / 1000) + '|' + p.title + '|' + p.body : '';
    if (key === lastBy[id]) return;
    lastBy[id] = key;
    const L = window.I18N ? I18N.L : t => t;
    nb.postMessage(p ? { op: 'set', id, at: p.at, title: L(p.title), body: L(p.body) } : { op: 'clear', id });
  }
  function sync() {
    if (!nb) return;
    post('heist', nOn ? plan() : null);
    post('daily', nOn ? dailyPlan() : null);
  }

  const Notify = {
    get supported() { return !!nb; },
    get on() { return nOn; },
    set on(v) { nOn = !!v; setPref('gk_notify', nOn); sync(); },
    get status() { return status; },
    _status(s) { const ch = s !== status; status = s; if (ch && window.UI && UI.refresh) UI.refresh(); },
    sync, plan, dailyPlan,
  };
  window.Notify = Notify;

  // ---------- Game Center ----------
  // iOS uygulamasında oyuncu Game Center'a giriş yaptıysa başarımlar ve sıralamalar oraya da gönderilir.
  // Kimlikler: başarım "kh_<id>", sıralamalar "kh_loot" (toplam ganimet) ve "kh_level" (seviye).
  // Bunlar App Store Connect'te aynı kimliklerle tanımlanmalı (ios/APP_STORE.md).
  // 1.0'da kapalıydı, 1.1'de açık. Kapatılırsa (false) giriş istenmez, hiçbir şey gönderilmez;
  // başarımlar oyun içinde çalışmaya devam eder.
  const GC_ENABLED = true;
  const gb = GC_ENABLED ? bridge('gc') : null;
  let gOk = false, alias = '', sent = {};
  const GC = {
    get available() { return gOk; },
    get alias() { return alias; },
    _status(ok, name) {
      gOk = !!ok; alias = name || '';
      if (!gOk) return;
      sent = {};
      Object.keys(G.s.ach || {}).forEach(id => GC.unlock(id)); // daha önce açılanları da eşitle
      GC.scores();
      if (window.UI && UI.refresh) UI.refresh();
    },
    unlock(id) { if (gOk && gb) gb.postMessage({ op: 'ach', id: 'kh_' + id }); },
    // Değer değiştikçe sıralamaya gönder
    scores() {
      if (!gOk || !gb) return;
      const v = { kh_loot: Math.floor(G.s.stats.loot), kh_level: G.s.lv };
      Object.keys(v).forEach(k => { if (sent[k] !== v[k]) { sent[k] = v[k]; gb.postMessage({ op: 'score', id: k, value: v[k] }); } });
    },
    show() { if (gb) gb.postMessage({ op: 'show' }); },
  };
  window.GC = GC;
  // Giriş, oyuncu "Oyuna başla"ya dokunduktan sonra istenir (açılış ekranını kapatmasın diye)
  if (gb) document.addEventListener('gk:start', () => gb.postMessage({ op: 'auth' }));
  if (nb) { nb.postMessage({ op: 'status' }); setInterval(sync, 1000); }

  // ---------- Puan isteme ----------
  // Oyuncu 2. seviyeye ulaşınca, ekranda açık bir pencere yokken bir kez Apple'ın puan penceresi istenir.
  // (Apple pencereyi yılda en çok 3 kez gösterir ve ne zaman göstereceğine kendisi karar verir.)
  const rb = bridge('review');
  if (rb) setInterval(() => {
    const S = G.s;
    if (S.lv < 2 || (S.seen && S.seen.review) || document.querySelector('.modal, .coach, #splash')) return;
    G.markSeen('review');
    setTimeout(() => rb.postMessage('ask'), 1200);
  }, 2000);

  // ---------- iCloud yedeği ----------
  // Kayıt telefonda durur; ayrıca iCloud'a (anahtar-değer deposu) yedeklenir.
  //  - Uygulama yeni kurulduysa (bu cihazda hiç kayıt yoksa) ve iCloud'da kayıt varsa otomatik geri yüklenir.
  //  - Cihazdaki oyun iCloud'dakinden gerideyse Ayarlar'da "iCloud'dan yükle" düğmesi çıkar.
  //  - Yedek en geç 30 saniyede bir ve oyundan çıkarken alınır; iCloud'daki daha ileri bir kayıt
  //    kendiliğinden ezilmez (iki cihazla oynayan biri ilerlemesini kaybetmesin).
  const cb = bridge('cloud');
  const prog = d => d && d.stats ? (d.lv || 1) * 1e12 + (d.stats.loot || 0) : -1;
  let remote = null, remoteRaw = null, ready = false, last = '';
  function backup(force) {
    if (!cb || !ready) return;
    const raw = G.exportSave();
    if (raw === last && !force) return;
    if (remote && prog(remote) > prog(G.s)) return; // iCloud'daki daha ileri: ezme
    last = raw; remote = JSON.parse(raw); remoteRaw = raw;
    cb.postMessage({ op: 'save', data: raw, t: Date.now() });
  }
  const Cloud = {
    get supported() { return !!cb; },
    get ready() { return ready; },
    get remote() { return remote; },
    // iCloud'daki kayıt bu cihazdakinden ileride mi?
    get ahead() { return !!remote && prog(remote) > prog(G.s); },
    // Yerel taraf iCloud'daki kaydı gönderir (açılışta ve başka cihaz yedek aldığında). raw: metin ya da null
    _got(raw) {
      let d = null;
      try { d = raw ? JSON.parse(raw) : null; } catch (e) { d = null; }
      if (d && d.v !== 1) d = null;
      remote = d; remoteRaw = d ? raw : null;
      const first = !ready; ready = true;
      if (first && d && !G.hadSave && prog(d) > prog(G.s) && G.importSave(raw)) { location.reload(); return; }
      if (window.UI && UI.refresh) UI.refresh();
      if (first && Cloud.ahead && window.UI && UI.toast) UI.toast('<i class="ti ti-cloud-download" aria-hidden="true"></i>iCloud\'da daha ileri bir kayıt var. Ayarlar\'dan yükleyebilirsin.');
      backup();
    },
    restore() { if (remoteRaw && G.importSave(remoteRaw)) location.reload(); },
  };
  window.Cloud = Cloud;
  if (cb) {
    cb.postMessage({ op: 'get' });
    setInterval(backup, 30000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) backup(); });
    window.addEventListener('pagehide', () => backup());
  }
})();
