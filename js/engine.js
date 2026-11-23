// Oyun motoru. Döneme bağlı hiçbir isim veya metin içermez; her şeyi window.ERA'dan okur.
(function () {
  const E = window.ERA;
  const KEY = 'gk_save_' + E.id;
  const by = list => Object.fromEntries(list.map(x => [x.id, x]));
  const tierById = by(E.tiers), targetById = by(E.targets), skillById = by(E.skills), toolById = by(E.tools), crewById = by(E.crew || []);
  const M = E.market, itemById = by(M ? M.items : []);
  const MA = E.mastery, masteryById = by(MA ? MA.items : []);
  const SEC = E.security || { penalty: 0, loot: 0, xp: 0, decayDays: 1e9, label: '' };

  const CITIES = E.cities || [{ id: 'main', name: '', lv: 1 }];
  const homeCity = CITIES[0].id, cityById = by(CITIES);
  const cityOf = t => t.city || homeCity;
  const COL = E.collection, colItemById = by(COL ? COL.items : []), colSetById = by(COL ? COL.sets : []);

  let S;

  function fresh() {
    return {
      v: 1, day: 0, lv: 1, xp: 0, money: E.start.money, gems: E.start.gems, fame: 0, heat: 0, sp: 1,
      skills: [], tools: [], crew: {}, mastery: {}, sec: {}, legends: {},
      city: homeCity, cities: [homeCity], heatBy: {}, collection: {}, setsDone: {}, ach: {}, goods: [], legendOffer: null, buffs: [], market: null, heist: null, scouted: {}, cooldown: {}, streak: 0,
      stats: { robs: 0, ok: 0, fail: 0, caught: 0, loot: 0, scouts: 0 },
      quest: { i: 0, prog: 0 },
      news: [{ day: 0, kind: 'intro', h: E.news.intro.h, b: E.news.intro.b }],
      won: false,
    };
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && d.v === 1) { S = Object.assign(fresh(), d); return; }
    } catch (e) { /* kayıt okunamazsa yeni oyun */ }
    S = fresh();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* tarayıcı izin vermezse sessizce geç */ } }
  function reset() { S = fresh(); save(); }
  // Tek seferlik şeyleri (örn. karşılama penceresi) hatırla
  function markSeen(key) { S.seen = S.seen || {}; S.seen[key] = true; save(); }

  const LL = E.lateLevel || { from: 1e9, growth: 0 };
  const xpCap = lv => Math.round(60 * Math.pow(lv, 1.65) * (lv > LL.from ? 1 + (lv - LL.from) * LL.growth : 1));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  function effects() {
    const out = [];
    S.skills.forEach(id => { const s = skillById[id]; if (s) s.effects.forEach(e => out.push({ ...e, src: s.name })); });
    S.tools.forEach(id => { const t = toolById[id]; if (t) t.effects.forEach(e => out.push({ ...e, src: t.name })); });
    Object.entries(S.crew).forEach(([id, lv]) => { const c = crewById[id]; if (c) c.levels[lv - 1].effects.forEach(e => out.push({ ...e, src: c.name })); });
    Object.keys(S.setsDone || {}).forEach(id => { const st = colSetById[id]; if (st) st.effects.forEach(e => out.push({ ...e, src: st.name })); });
    Object.entries(S.mastery || {}).forEach(([id, n]) => {
      const m = masteryById[id]; if (!m || !n) return;
      const e = m.effect, v = e.kind === 'heat' ? Math.pow(e.v, n) : e.v * n;
      out.push({ ...e, v, src: `${m.name} ×${n}` });
    });
    return out;
  }
  const has = id => S.skills.includes(id);
  const tierOpen = tid => { const t = tierById[tid]; return S.lv >= t.lv && (!t.skill || has(t.skill)); };
  const foreign = t => cityOf(t) !== homeCity;
  const needLv = t => foreign(t) ? (t.lv || 1) : Math.max(tierById[t.tier].lv, t.lv || 1);
  const targetOpen = t => foreign(t) ? (S.cities.includes(cityOf(t)) && S.lv >= needLv(t)) : (tierOpen(t.tier) && S.lv >= needLv(t));
  const cooldownLeft = t => Math.max(0, (S.cooldown[t.id] || 0) - S.day);
  const scoutCost = t => Math.max(15, Math.round(t.loot[0] * 0.2 / 5) * 5);

  function requirements(t) {
    const tr = tierById[t.tier], out = [{ text: 'Seviye ' + needLv(t), ok: S.lv >= needLv(t) }];
    if (foreign(t)) { out.push({ text: cityById[cityOf(t)].name + ' yolculuğu', ok: S.cities.includes(cityOf(t)) }); return out; }
    if (tr.skill) out.push({ text: skillById[tr.skill].name, ok: has(tr.skill) });
    return out;
  }

  // Güvenlik: soyulan yer korunaklı hale gelir, zamanla gevşer.
  function security(t) {
    const x = (S.sec || {})[t.id];
    if (!x) return 0;
    return Math.max(0, x.lv - Math.floor((S.day - x.day) / SEC.decayDays));
  }
  const lootRange = t => { const k = 1 + SEC.loot * security(t); return [Math.round(t.loot[0] * k), Math.round(t.loot[1] * k)]; };
  const xpFor = t => Math.round(t.xp * (1 + SEC.xp * security(t)));

  // Gecenin havası: takvim gününe göre tek bir durum (aynı gün herkes için aynı).
  const strHash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const seeded = str => { let a = strHash(str); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const NIGHTS = E.nights || [];
  function tonight(now = new Date()) {
    if (!NIGHTS.length) return null;
    const r = seeded('gece|' + E.id + '|' + dayKey(now))() * NIGHTS.reduce((a, n) => a + (n.w || 1), 0);
    let acc = 0;
    for (const n of NIGHTS) { acc += n.w || 1; if (r < acc) return n; }
    return NIGHTS[0];
  }
  // Bu gecenin etkisi belirli bir hedefe uygulanıyor mu (şans etkisi tiers ile sınırlı olabilir)
  const nightP = t => { const n = tonight(), f = n && n.fx; return f && f.p && (!f.tiers || f.tiers.includes(t.tier)) ? f.p : 0; };
  const nightFx = k => { const n = tonight(); return n && n.fx && n.fx[k] != null ? n.fx[k] : null; };

  function odds(t) {
    const ef = effects();
    const rows = [{ icon: 'target', text: 'Temel şans', v: t.base, base: true }];
    t.factors.forEach(f => {
      const c = f.tag && ef.find(e => e.kind === 'cancel' && e.tag === f.tag);
      rows.push({ icon: f.icon, text: f.text, v: c ? 0 : f.v, orig: f.v, canceledBy: c ? c.src : null });
    });
    ef.filter(e => e.kind === 'bonus' && (!e.tiers || e.tiers.includes(t.tier)))
      .forEach(e => rows.push({ icon: 'sparkles', text: e.src, v: e.v }));
    if (S.scouted[t.id]) rows.push({ icon: 'eye-search', text: 'Keşif bilgisi', v: 10 + ef.filter(e => e.kind === 'scout').reduce((a, e) => a + e.v, 0) });
    S.buffs.forEach(id => { const it = itemById[id]; if (it && it.kind === 'nextBonus') rows.push({ icon: it.icon, text: it.name, v: it.v }); });
    const sl = security(t);
    if (sl > 0) rows.push({ icon: 'shield-lock', text: `${SEC.label} · ${sl}. seviye`, v: -SEC.penalty * sl });
    if (S.heat > 0) rows.push({ icon: 'urgent', text: heatLabel(), v: -5 * S.heat });
    const np = nightP(t); if (np) rows.push({ icon: tonight().icon, text: tonight().name, v: np, night: true });
    const p = Math.max(5, Math.min(95, rows.reduce((a, r) => a + r.v, 0)));
    return { rows, p };
  }
  const buffSum = kind => S.buffs.reduce((a, id) => a + (itemById[id] && itemById[id].kind === kind ? (itemById[id].v || 1) : 0), 0);
  const lootMult = () => 1 + effects().filter(e => e.kind === 'loot').reduce((a, e) => a + e.v, 0) + buffSum('lootBoost');
  const heatMult = () => effects().filter(e => e.kind === 'heat').reduce((a, e) => a * e.v, 1) * (nightFx('heat') || 1);

  function dateOf(day) {
    const d = new Date(E.startDate.y, E.startDate.m, E.startDate.d + day);
    return d.getDate() + ' ' + E.months[d.getMonth()] + ' ' + d.getFullYear();
  }
  // Ad cümle ortasındaysa İngilizcede baştaki 'The' küçük harf olsun ("The owners of the bank...")
  const fill = (s, t) => s.replace(/\{name\}/g, (m, off) => off === 0 ? t.name : t.name.replace(/^The /, 'the ')).replace(/\{at\}/g, t.at);
  function addNews(kind, t) {
    const n = pick(E.news[kind]);
    S.news.unshift({ day: S.day, kind, h: fill(n[0], t), b: fill(n[1], t) });
    S.news = S.news.slice(0, 15);
    return S.news[0];
  }

  // Görevler
  const quest = () => E.quests[S.quest.i % E.quests.length];
  const questAvailable = q => (!q.tier || tierOpen(q.tier)) && S.lv >= (q.lv || 1);
  const questDone = () => S.quest.prog >= quest().n;
  function nextQuest() {
    for (let k = 1; k <= E.quests.length; k++) {
      const j = (S.quest.i + k) % E.quests.length;
      if (questAvailable(E.quests[j])) { S.quest = { i: j, prog: 0 }; return; }
    }
  }
  function ensureQuest() { if (!questAvailable(quest())) nextQuest(); }
  function bump(type, info) {
    const q = quest();
    if (questDone() || q.type !== type) return;
    if (type === 'rob' && q.tier && q.tier !== info.tier) return;
    if (type === 'streak') S.quest.prog = Math.max(S.quest.prog, info.streak);
    else if (type === 'loot') S.quest.prog += info.amount;
    else S.quest.prog++;
  }
  // Takılan görev değiştirilebilir: gecede bir kez, başka yapılabilir görev varsa.
  const otherQuest = () => E.quests.some((q, j) => j !== S.quest.i % E.quests.length && questAvailable(q));
  const canSkipQuest = () => !questDone() && S.quest.skipDay !== S.day && otherQuest();
  function skipQuest() {
    if (!canSkipQuest()) return false;
    nextQuest(); S.quest.skipDay = S.day; save(); return true;
  }
  // Ödüllü reklamlar: her ödülün sınırı var ki reklam dengeyi bozmasın.
  //   rush   : sürmekte olan işi bir sonraki olaya / sona atla (takvim gününde toplam RUSH_AD_MAX kez)
  //   double : son başarılı işin ganimetini bir kez daha ver (sonuç başına 1)
  //   heat   : takibi 1 düşür (gecede 1)
  //   gem    : 1 elmas (gecede 1)
  //   skip   : görev değiştirme hakkı bittiyse bir kez daha (gecede 1)
  const RUSH_AD_MAX = 5;
  const rushAdsLeft = () => { const r = S.adRush || {}; return r.d === dayKey() ? Math.max(0, RUSH_AD_MAX - (r.n || 0)) : RUSH_AD_MAX; };
  const adUsed = k => (S.ads || {})[k] === S.day;
  const markAd = k => { S.ads = S.ads || {}; S.ads[k] = S.day; };
  function canAd(k, res) {
    switch (k) {
      case 'rush': return !!S.heist && rushAdsLeft() > 0 && !!rushTarget();
      case 'double': return !!(res && res.ok && !res.doubled && res.loot > 0);
      case 'heat': return S.heat > 0 && !adUsed('heat');
      case 'gem': return !adUsed('gem');
      case 'skip': return !questDone() && otherQuest() && S.quest.skipDay === S.day && !adUsed('skip');
    }
    return false;
  }
  function adReward(k, res) {
    if (!canAd(k, res)) return null;
    let out = null;
    if (k === 'rush') { const r = rushTarget(); S.heist.start = Date.now() - r.to * 1000 - (r.event ? 0 : 1000); const today = dayKey(), n = (S.adRush && S.adRush.d === today) ? S.adRush.n : 0; S.adRush = { d: today, n: n + 1 }; out = true; }
    if (k === 'double') { S.money += res.loot; S.stats.loot += res.loot; res.doubled = true; out = res.loot; }
    if (k === 'heat') { S.heat--; markAd('heat'); out = true; }
    if (k === 'gem') { S.gems++; markAd('gem'); out = 1; }
    if (k === 'skip') { const day = S.quest.skipDay; nextQuest(); S.quest.skipDay = day; markAd('skip'); out = quest(); }
    save(); return out;
  }
  // Satın alınan elmaslar (mağaza onayladıktan sonra çağrılır)
  function addGems(n) { if (!(n > 0)) return false; S.gems += n; S.stats.bought = (S.stats.bought || 0) + n; save(); return true; }
  function claimQuest() {
    if (!questDone()) return null;
    const r = quest().reward;
    S.money += r.money || 0; S.gems += r.gems || 0;
    nextQuest(); save();
    return r;
  }

  // Günlük giriş ödülü: gerçek takvim gününe göre. Art arda gelinen günlerde ödül büyür (7 günlük döngü);
  // bir gün kaçarsa seri baştan başlar. Para ödülü oyuncunun açabildiği en zengin hedefe göre ölçeklenir.
  const DAILY = (E.daily && E.daily.cycle) || [{ money: 0.6 }, { money: 0.8 }, { gems: 1 }, { money: 1 }, { money: 1.2, gems: 1 }, { money: 1.5 }, { money: 2, gems: 3 }];
  const dayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const nice = n => { if (n < 100) return Math.max(10, Math.round(n / 5) * 5); const p = Math.pow(10, Math.floor(Math.log10(n)) - 1); return Math.round(n / p) * p; };
  function dailyBase() {
    let best = 40;
    E.targets.forEach(t => { if (targetOpen(t)) best = Math.max(best, (t.loot[0] + t.loot[1]) / 2); });
    return best;
  }
  function dailyState(now = new Date()) {
    const d = S.daily || { last: null, n: 0 }, today = dayKey(now);
    const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const ready = d.last !== today;
    const cont = d.last === today || d.last === dayKey(y); // seri sürüyor mu
    const n = cont ? d.n : 0;                              // bugüne kadar art arda alınan gün
    const idx = ready ? n % DAILY.length : (n - 1) % DAILY.length; // bugünün (ya da alınmış olanın) sırası
    const base = dailyBase();
    const rewards = DAILY.map(r => ({ money: r.money ? nice(base * r.money) : 0, gems: r.gems || 0 }));
    return { ready, idx, streak: n, rewards, reward: rewards[idx] };
  }
  function claimDaily(now = new Date()) {
    const st = dailyState(now);
    if (!st.ready) return null;
    S.money += st.reward.money; S.gems += st.reward.gems;
    S.daily = { last: dayKey(now), n: st.streak + 1 }; S.stats.dailyBest = Math.max(S.stats.dailyBest || 0, st.streak + 1);
    save();
    return { ...st.reward, day: st.idx + 1, streak: st.streak + 1 };
  }

  // "Sen yokken": oyuncu uzun süre uzak kalınca neler olduğunu toplar. Uzaktayken zabıta takibi
  // yavaş yavaş söner (her birkaç saatte bir kademe). Son görülme zamanı S.lastSeen'de tutulur.
  // Ekip kazancı: her üye saatte (en zengin açık hedefin ortalama ganimeti × crewPerHour) kazanır,
  // eğitimli üye daha çok (seviye başına +%50). En çok crewMaxHours saat sayılır, crewMinMinutes altı sayılmaz.
  const AW = Object.assign({ minMinutes: 15, heatEveryHours: 3, crewPerHour: 0.025, crewMaxHours: 8, crewMinMinutes: 60 }, E.away || {});
  function crewEarnings(ms) {
    const ids = Object.keys(S.crew).filter(id => crewById[id]);
    if (!ids.length || ms < AW.crewMinMinutes * 60000) return null;
    const hours = Math.min(ms / 3600000, AW.crewMaxHours);
    const perHour = ids.reduce((a, id) => a + dailyBase() * AW.crewPerHour * (1 + 0.5 * (S.crew[id] - 1)), 0);
    const money = nice(perHour * hours);
    return { money, hours, capped: ms / 3600000 > AW.crewMaxHours, names: ids.map(id => crewById[id].name) };
  }
  let lastSaveAt = 0;
  function touch(now = Date.now(), force = false) {
    S.lastSeen = now;
    if (force || now - lastSaveAt > 20000) { lastSaveAt = now; save(); }
  }
  function awayCheck(now = Date.now()) {
    const last = S.lastSeen;
    S.lastSeen = now;
    if (!last || now - last < AW.minMinutes * 60000 || !S.stats.robs) { save(); return null; }
    const ms = now - last, out = { ms, rows: [] };
    // Soygun
    const st = heistStatus();
    if (st) {
      const t = targetById[st.id];
      if (st.done) out.rows.push({ kind: 'done', icon: 'flag-check', tone: 'ok', text: `<b>${t.name}</b> işi bitti. Sonucu şimdi göreceksin.` });
      else if (st.pending) out.rows.push({ kind: 'event', icon: 'alert-triangle', tone: 'wa', text: `<b>${t.name}</b> işinde bir şey oldu: ${st.pending.title}. Ne yapacağına sen karar vereceksin.` });
      else out.rows.push({ kind: 'run', icon: 'clock', tone: 'mu', text: `<b>${t.name}</b> işi sürüyor, ${Math.ceil(st.totalLeft / 60)} dakika kaldı.` });
    }
    // Zabıta takibi söner
    const steps = Math.floor(ms / (AW.heatEveryHours * 3600000));
    if (S.heat > 0 && steps > 0) {
      const h0 = S.heat; S.heat = Math.max(0, S.heat - steps);
      out.rows.push({ kind: 'heat', icon: 'shield-check', tone: 'ok', text: S.heat ? `${heatLabel()} gevşedi: <b>${h0}/5 → ${S.heat}/5</b>.` : `${heatLabel()} seni unuttu: <b>${h0}/5 → 0/5</b>. Sokaklar yine senin.`, h0, h1: S.heat });
    }
    // Ekip ufak işler çevirdi
    const ce = crewEarnings(ms);
    if (ce) {
      S.money += ce.money;
      const who = ce.names.length === 1 ? ce.names[0] : ce.names.length === 2 ? ce.names.join(' ve ') : 'Ekibin';
      out.rows.push({ kind: 'crew', icon: 'users', tone: 'au', money: ce.money,
        text: `${who} sen yokken ufak işler çevirdi: <b>+${ce.money.toLocaleString((window.I18N ? I18N.locale : 'tr-TR'))} ${E.currency}</b>.${ce.capped ? ` <span class="awn">(en çok ${AW.crewMaxHours} saatlik)</span>` : ''}` });
    }
    if (!out.rows.length) { save(); return null; }
    const d = dailyState(new Date(now));
    if (d.ready) out.rows.push({ kind: 'daily', icon: 'calendar-star', tone: 'au', text: `Günlük ödülün hazır: <b>${d.idx + 1}. gün</b>.` });
    save();
    return out;
  }

  // Başarımlar: sayaçlara bakar; yeni açılanlara elmas verir ve listesini döndürür.
  const ACH = E.achievements || [], achById = by(ACH);
  const achTarget = a => a.n === 'all' ? CITIES.length : a.n;
  function achValue(a) {
    const st = S.stats;
    if (a.kind.startsWith('tier:')) { const tr = a.kind.slice(5); return Object.keys(S.sec).filter(id => targetById[id] && targetById[id].tier === tr).length; }
    switch (a.kind) {
      case 'ok': return st.ok; case 'robs': return st.robs; case 'loot': return st.loot; case 'caught': return st.caught; case 'scouts': return st.scouts;
      case 'bestStreak': return Math.max(st.bestStreak || 0, S.streak); case 'events': return st.events || 0; case 'miniWins': return st.miniWins || 0; case 'sold': return st.sold || 0; case 'dailyBest': return st.dailyBest || 0;
      case 'lv': return S.lv; case 'cities': return S.cities.length; case 'crew': return crewCount(); case 'skills': return S.skills.length;
      case 'crewMax': return Object.keys(S.crew).filter(id => S.crew[id] >= 3).length;
      case 'sets': return Object.keys(S.setsDone).length; case 'legends': return Object.keys(S.legends).length;
      default: return 0;
    }
  }
  const achState = () => ACH.map(a => ({ a, done: !!(S.ach || {})[a.id], cur: Math.min(achValue(a), achTarget(a)), n: achTarget(a) }));
  function checkAch() {
    S.ach = S.ach || {};
    const fresh = ACH.filter(a => !S.ach[a.id] && achValue(a) >= achTarget(a));
    if (!fresh.length) return [];
    fresh.forEach(a => { S.ach[a.id] = Date.now(); S.gems += a.gems || 0; });
    save(); return fresh;
  }

  function levelUps() {
    let n = 0;
    while (S.xp >= xpCap(S.lv)) { S.xp -= xpCap(S.lv); S.lv++; S.sp++; S.gems++; n++; }
    if (n) ensureQuest();
    return n;
  }

  // Soygun gerçek zamanlı üç aşamada sürer. Başarı şansı ve karaborsa etkileri başlarken sabitlenir.
  // Aşamalar sırasında olaylar çıkabilir: olay çıkınca sayaç durur, oyuncu seçim yapana kadar bekler.
  // Soygun süresi: hedefin temel süresi, o anki zorluğa göre (Kolay kısa, Zor uzun) ölçeklenir.
  const baseTimes = t => t.time || tierById[t.tier].time || [2, 3, 1];
  function heistTimes(t) {
    const rules = (E.heist && E.heist.timeByDifficulty) || [];
    const p = odds(t).p, r = rules.find(x => p >= x.min);
    const k = (r ? r.mult : 1) * (nightFx('time') || 1);
    return baseTimes(t).map(s => Math.max(5, Math.round(s * k)));
  }
  const eventById = by(E.events || []);
  const HC = E.heist || {};
  function pickPattern() {
    const pats = HC.eventPatterns || [{ phases: [], w: 1 }];
    let r = Math.random() * pats.reduce((a, x) => a + x.w, 0);
    for (const x of pats) { r -= x.w; if (r < 0) return x.phases; }
    return [];
  }
  function scheduleEvents(t, times) {
    const out = [], phases = pickPattern();
    let acc = 0;
    times.forEach((dur, phase) => {
      const pool = (E.events || []).filter(e => e.phase === phase && (!e.tiers || e.tiers.includes(t.tier)));
      if (phases.includes(phase) && pool.length) {
        const e = pool[Math.floor(Math.random() * pool.length)];
        out.push({ id: e.id, at: Math.round(acc + dur * (0.25 + Math.random() * 0.45)), done: false });
      }
      acc += dur;
    });
    return out;
  }
  // Aletler: bu işte gerçekten işe yarayanlar not edilir; iş bitince tek kullanımlıklar biter, diğerleri kırılabilir.
  function toolHelps(tl, t) {
    return tl.effects.some(e => e.kind === 'cancel' ? t.factors.some(f => f.tag === e.tag)
      : e.kind === 'bonus' ? (!e.tiers || e.tiers.includes(t.tier)) : true);
  }
  function wearTools(h) {
    const usedUp = [], broken = [];
    (h.tools || []).forEach(id => {
      const tl = toolById[id];
      if (!tl || !S.tools.includes(id)) return;
      if (tl.uses) { S.tools = S.tools.filter(x => x !== id); usedUp.push(tl); }
      else if (tl.brk && Math.random() < tl.brk) { S.tools = S.tools.filter(x => x !== id); broken.push(tl); }
    });
    return { usedUp, broken };
  }
  // Soygun planı: giriş yolları
  const ROUTES = E.routes || [{ id: 'kapi', name: '', fx: {} }], routeById = by(ROUTES);
  const routeOpen = (r, t) => (!r.req || !r.req.skill || has(r.req.skill)) && (!r.tiers || r.tiers.includes(t.tier));
  const routeWhy = r => r.req && r.req.skill && !has(r.req.skill) ? ((skillById[r.req.skill] || {}).name || r.req.skill) + ' yeteneği gerekli' : r.tiers ? 'Sadece ' + r.tiers.map(id => (tierById[id] || {}).name || id).join(' ve ').toLocaleLowerCase('tr-TR') + ' için' : '';
  function routePreview(t, rid) {
    const r = routeById[rid] || ROUTES[0], f = r.fx || {};
    const times = heistTimes(t).map(x => Math.max(5, Math.round(x * (f.time || 1))));
    return { p: Math.max(5, Math.min(95, odds(t).p + (f.p || 0))), total: times.reduce((a, b) => a + b, 0), times, open: routeOpen(r, t), why: routeWhy(r) };
  }
  function startHeist(id, rid) {
    const t = targetById[id];
    if (S.heist || !t || !targetOpen(t) || cooldownLeft(t) > 0 || cityOf(t) !== S.city) return false;
    const route = routeById[rid] || ROUTES[0];
    if (!routeOpen(route, t)) return false;
    const rf = route.fx || {}, pv = routePreview(t, route.id);
    const times = pv.times.slice();
    S.lastRoute = route.id;
    S.heist = {
      id, start: Date.now(), times, events: scheduleEvents(t, times), log: [],
      tools: S.tools.filter(x => { const tl = toolById[x]; return tl && (tl.uses || toolHelps(tl, t)); }),
      snap: { p: pv.p, route: route.id, heat: rf.heat || 1, loot: lootMult() + (nightFx('loot') || 0) + (rf.loot || 0), xp: 1 + buffSum('xpBoost') + (nightFx('xp') || 0), night: (tonight() || {}).id, safe: buffSum('safeFail') > 0, used: S.buffs.map(b => itemById[b].name) },
    };
    S.buffs = [];
    save(); return true;
  }
  function heistStatus() {
    const h = S.heist;
    if (!h) return null;
    let el = (Date.now() - h.start) / 1000;
    const total = h.times.reduce((a, b) => a + b, 0);
    const ev = (h.events || []).find(e => !e.done && e.at <= el);
    if (ev) el = ev.at;
    let acc = 0, phase = h.times.length;
    for (let i = 0; i < h.times.length; i++) { if (el < acc + h.times[i]) { phase = i; break; } acc += h.times[i]; }
    const dur = h.times[phase] || 1, inPhase = phase < h.times.length ? el - acc : dur;
    return {
      id: h.id, phase, phaseLeft: Math.max(0, Math.ceil(dur - inPhase)), phaseProg: Math.min(1, inPhase / dur),
      totalLeft: Math.max(0, Math.ceil(total - el)), total, done: !ev && el >= total,
      pending: ev ? eventById[ev.id] : null, p: h.snap.p, log: h.log,
    };
  }
  function choiceOpen(c) {
    const r = c.req;
    if (!r) return true;
    if (r.crew) return !!S.crew[r.crew];
    if (r.skill) return has(r.skill);
    if (r.tool) return S.tools.includes(r.tool);
    return true;
  }
  function reqText(c) {
    const r = c.req;
    if (!r) return '';
    if (r.crew) return (crewById[r.crew] || {}).name + ' ekipte olmalı';
    if (r.skill) return (skillById[r.skill] || {}).name + ' yeteneği gerekli';
    if (r.tool) return (toolById[r.tool] || {}).name + ' gerekli';
    return '';
  }
  // Seçeneğin gerçek şansı: hedef büyüdükçe ve takip arttıkça riskler büyür.
  function choicePenalty() {
    const h = S.heist; if (!h) return 0;
    const ti = E.tiers.findIndex(x => x.id === targetById[h.id].tier);
    return Math.max(0, ti) * (HC.choiceTierPenalty || 0) + S.heat * (HC.choiceHeatPenalty || 0);
  }
  const choiceChance = c => c.chance == null ? null : Math.max(5, Math.min(95, c.chance - choicePenalty()));
  function choose(idx) {
    const st = heistStatus();
    if (!st || !st.pending) return null;
    const ev = st.pending, c = ev.choices[idx];
    if (!c || !choiceOpen(c)) return null;
    const ok = c.chance == null || Math.random() * 100 < choiceChance(c);
    return applyChoice(ev, c, ok);
  }
  // Mini oyun (kilit / kasa): sonucu oyuncunun becerisi belirler.
  function chooseMini(won) {
    const st = heistStatus();
    if (!st || !st.pending || !st.pending.mini) return null;
    const ev = st.pending, m = ev.mini;
    S.stats.minis = (S.stats.minis || 0) + 1; if (won) S.stats.miniWins = (S.stats.miniWins || 0) + 1;
    return applyChoice(ev, { text: m.text, ok: m.ok, fail: m.fail, chance: 0, mini: true }, !!won);
  }
  // Mini oyunun zorluğu: hedef büyüdükçe zorlaşır, ilgili yetenek ve alet kolaylaştırır.
  function miniSetup(kind) {
    const h = S.heist, t = h && targetById[h.id];
    const ti = t ? Math.max(0, E.tiers.findIndex(x => x.id === t.tier)) : 0;
    let zone = 0.24 - ti * 0.035, speed = 0.75 + ti * 0.18;
    const helps = kind === 'safe' ? { skill: 'kasa', tool: 'stetoskop' } : { skill: 'maymuncuk', tool: 'yag' };
    if (has(helps.skill)) zone += 0.05;
    if (S.tools.includes(helps.tool)) zone += 0.05;
    return { zone: Math.min(0.4, zone), speed, steps: 3, misses: 2, helps: [has(helps.skill) && (skillById[helps.skill] || {}).name, S.tools.includes(helps.tool) && (toolById[helps.tool] || {}).name].filter(Boolean) };
  }
  function applyChoice(ev, c, ok) {
    const h = S.heist;
    const pe = h.events.find(e => !e.done && e.id === ev.id);
    const fx = (ok ? c.ok : c.fail) || {};
    pe.done = true;
    S.stats.events = (S.stats.events || 0) + 1;
    h.start = Date.now() - pe.at * 1000; // sayaç olayın olduğu yerden devam eder
    if (c.req && c.req.tool) { h.tools = h.tools || []; if (!h.tools.includes(c.req.tool)) h.tools.push(c.req.tool); }
    const out = { event: ev, choice: c, ok, fx };
    h.log.push({ title: ev.title, choice: c.text, text: fx.text, ok, roll: c.chance != null, mini: !!c.mini });
    if (fx.abort) {
      S.heist = null; S.day++;
      const t = targetById[h.id], xp = Math.round(t.xp / 6);
      S.xp += xp;
      out.result = { aborted: true, target: t, xp, log: h.log, levelUps: levelUps(), lv: S.lv, used: h.snap.used, ...wearTools(h) };
      save(); return out;
    }
    if (fx.p) h.snap.p = Math.max(5, Math.min(95, h.snap.p + fx.p));
    if (fx.loot) h.snap.loot = Math.max(0.2, h.snap.loot + fx.loot);
    if (fx.heat) S.heat = Math.max(0, Math.min(5, S.heat + fx.heat));
    if (fx.fame) S.fame += fx.fame;
    if (fx.time) {
      let acc = 0, ph = 0;
      for (; ph < h.times.length - 1; ph++) { if (pe.at < acc + h.times[ph]) break; acc += h.times[ph]; }
      const minDur = pe.at - acc + 3, before = h.times[ph];
      h.times[ph] = Math.max(minDur, before + fx.time);
      const d = h.times[ph] - before;
      h.events.forEach(e => { if (!e.done && e.at > pe.at) e.at += d; });
    }
    save(); return out;
  }
  function defaultChoice(ev) {
    const i = ev.choices.findIndex(c => choiceOpen(c) && !(c.ok && c.ok.abort));
    return i < 0 ? 0 : i;
  }
  function finishHeist() {
    const st = heistStatus();
    if (!st || !st.done) return null;
    const h = S.heist; S.heist = null;
    const res = resolve(h.id, h.snap);
    res.log = h.log;
    Object.assign(res, wearTools(h)); save();
    return res;
  }
  // Hızlandırma bir sonraki olaya ya da işin sonuna atlar.
  function rushTarget() {
    const h = S.heist, st = heistStatus();
    if (!st || st.pending || st.done) return null;
    const el = (Date.now() - h.start) / 1000;
    const next = (h.events || []).find(e => !e.done && e.at > el);
    return { to: next ? next.at : st.total, left: Math.max(1, (next ? next.at : st.total) - el), event: !!next };
  }
  const rushCost = () => { const r = rushTarget(); return r ? Math.max(1, Math.ceil(r.left / 60) * (HC.rushGemsPerMinute || 1)) : 0; };
  function rush() {
    const r = rushTarget(), c = rushCost();
    if (!r || S.gems < c) return false;
    S.gems -= c; S.heist.start = Date.now() - r.to * 1000 - (r.event ? 0 : 1000); save(); return true;
  }
  // Anında soygun (simülasyon ve testler için): olaylarda varsayılan seçimi yapar.
  function rob(id, pickChoice) {
    if (!startHeist(id)) return null;
    for (let g = 0; g < 10; g++) {
      S.heist.start = 0;
      const st = heistStatus();
      if (!st.pending) break;
      const o = choose(pickChoice ? pickChoice(st.pending) : defaultChoice(st.pending));
      if (o && o.result) return o.result;
    }
    S.heist.start = 0;
    return finishHeist();
  }

  function resolve(id, snap) {
    const t = targetById[id], p = snap.p;
    const ok = Math.random() * 100 < p;
    S.day++; S.stats.robs++;
    const res = { ok, target: t, p, used: snap.used };
    const xpMult = snap.xp, safe = snap.safe;
    if (ok) {
      const sl = security(t), lr = lootRange(t);
      const gross = Math.round(rand(lr[0], lr[1]) * snap.loot);
      const cut = Math.round(gross * crewCut()); let loot = gross - cut;
      res.cut = cut;
      // Ganimetin bir kısmı eşya olarak gelebilir (yatakçıya satılır)
      const GD = E.goods, pool = GD && GD.items[t.tier];
      S.goods = S.goods || [];
      if (pool && S.goods.length < GD.max && Math.random() < GD.chance) {
        const g = pick(pool), v = Math.max(5, Math.round(loot * GD.share));
        loot -= v;
        res.good = { uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: g.name, icon: g.icon, cat: g.cat, v, from: t.name };
        S.goods.push(res.good);
      }
      S.money += loot; S.stats.ok++; S.stats.loot += loot;
      res.xp = Math.round(xpFor(t) * xpMult);
      S.xp += res.xp; S.fame += t.fame; S.streak++; S.stats.bestStreak = Math.max(S.stats.bestStreak || 0, S.streak);
      S.cooldown[t.id] = S.day + (t.cd || 2);
      delete S.scouted[t.id];
      Object.assign(res, { loot, fame: t.fame });
      if (S.heat > 0 && Math.random() < 0.3) { S.heat--; res.heatDown = true; }
      bump('rob', { tier: t.tier }); bump('streak', { streak: S.streak }); bump('loot', { amount: loot });
      if (COL) { const f = COL.items.find(i => i.target === t.id && !S.collection[i.id]); if (f) { S.collection[f.id] = true; res.found = f; res.sets = checkSets(); } }
      S.sec[t.id] = { lv: Math.min(SEC.max || 99, sl + 1), day: S.day }; if (sl < (SEC.max || 99)) res.secUp = sl + 1;
      if (t.legend && !S.legends[t.id]) {
        S.legends[t.id] = true; res.legend = true;
        if (t.legendNews) { S.news.unshift({ day: S.day, kind: 'legend', h: t.legendNews[0], b: t.legendNews[1] }); S.news = S.news.slice(0, 15); res.news = S.news[0]; }
        else res.news = addNews('legend', t);
      }
      else res.news = addNews(sl > 0 && E.news.repeat && Math.random() < 0.5 ? 'repeat' : 'success', t);
    } else {
      res.xp = Math.round(t.xp / 4 * xpMult); S.xp += res.xp;
      S.stats.fail++; S.streak = 0;
      if (safe) { res.safe = true; res.news = addNews('fail', t); }
      else if (Math.random() < 0.5 * heatMult() * (snap.heat || 1)) {
        if (S.heat >= 5) {
          res.caught = true; res.lost = Math.round(S.money * 0.3);
          S.money -= res.lost; S.heat = 2; S.day += 3; S.stats.caught++;
          res.news = addNews('caught', t);
        } else { S.heat++; res.heatUp = true; res.news = addNews('heat', t); }
      } else res.news = addNews('fail', t);
    }
    res.levelUps = levelUps(); res.lv = S.lv;
    save();
    return res;
  }

  // Yatakçılar: her gece her eşya için farklı teklif. Pazarlık bir kez yapılır: ya teklif yükselir
  // ya da yatakçı alınır ve o gece o malı almaz.
  const FENCES = E.fences || [], fenceById = by(FENCES);
  function haggleState() {
    if (!S.haggle || S.haggle.day !== S.day) S.haggle = { day: S.day, m: {} };
    return S.haggle.m;
  }
  function fenceOffer(fid, uid) {
    const f = fenceById[fid], g = (S.goods || []).find(x => x.uid === uid);
    if (!f || !g) return null;
    if (f.only && !f.only.includes(g.cat)) return { no: 'only' };
    const hm = haggleState()[fid + '|' + uid];
    if (hm === -1) return { no: 'angry' };
    const base = f.min + seeded(fid + '|' + uid + '|' + S.day)() * (f.max - f.min);
    return { price: Math.round(g.v * base * (hm || 1)), haggled: !!hm, risk: f.risk || 0 };
  }
  const haggleChance = () => 0.55 + (has('pazarlik') ? 0.15 : 0) + (has('tatli') ? 0.05 : 0);
  function haggle(fid, uid) {
    const o = fenceOffer(fid, uid);
    if (!o || o.no || o.haggled) return null;
    const k = fid + '|' + uid, m = haggleState();
    if (Math.random() < haggleChance()) { m[k] = 1.12 + Math.random() * 0.12; save(); return { ok: true, offer: fenceOffer(fid, uid) }; }
    m[k] = -1; save(); return { ok: false };
  }
  function sellGood(fid, uid) {
    const o = fenceOffer(fid, uid);
    if (!o || o.no) return null;
    const g = S.goods.find(x => x.uid === uid);
    S.goods = S.goods.filter(x => x.uid !== uid);
    S.money += o.price; S.stats.loot += o.price; S.stats.sold = (S.stats.sold || 0) + 1;
    bump('loot', { amount: o.price });
    const out = { good: g, price: o.price, fence: fenceById[fid] };
    if (o.risk && Math.random() < o.risk) { S.heat = Math.min(5, S.heat + 1); out.heatUp = true; }
    save(); return out;
  }

  // Kozmetikler: simge ve renk. Elmasla alınır ya da başarımla açılır.
  const COS = E.cosmetics || { icons: [], colors: [] };
  const cosList = kind => COS[kind] || [];
  const cosItem = (kind, id) => cosList(kind).find(x => x.id === id);
  function cosOwned(kind, id) {
    const it = cosItem(kind, id); if (!it) return false;
    if (it.ach) return !!(S.ach || {})[it.ach];
    return !it.gems || ((S.cos || {}).own || []).includes(kind + ':' + id);
  }
  function cosEquipped(kind) {
    const c = S.cos || {}, id = kind === 'icons' ? c.icon : c.color;
    return id && cosOwned(kind, id) ? id : (cosList(kind)[0] || {}).id;
  }
  function cosLook() {
    const ic = cosItem('icons', cosEquipped('icons')) || { icon: E.heroIcon }, col = cosItem('colors', cosEquipped('colors')) || {};
    return { icon: ic.icon, bg: col.bg || '', fg: col.fg || '' };
  }
  function equipCos(kind, id) {
    if (!cosOwned(kind, id)) return false;
    S.cos = S.cos || { own: [] };
    if (kind === 'icons') S.cos.icon = id; else S.cos.color = id;
    save(); return true;
  }
  function buyCos(kind, id) {
    const it = cosItem(kind, id);
    if (!it || it.ach || cosOwned(kind, id) || S.gems < it.gems) return false;
    S.gems -= it.gems; S.cos = S.cos || { own: [] }; S.cos.own = S.cos.own || []; S.cos.own.push(kind + ':' + id);
    equipCos(kind, id); return true;
  }

  function scout(id) {
    const t = targetById[id], c = scoutCost(t);
    if (!t || S.scouted[id] || S.money < c) return false;
    S.money -= c; S.scouted[id] = true; S.stats.scouts++; bump('scout');
    save(); return true;
  }
  function rest() {
    if (S.heist) return false;
    S.day++;
    const down = S.heat > 0 && Math.random() < 0.5;
    if (down) S.heat--;
    save(); return down;
  }
  function bribe() {
    if (S.heat <= 0 || S.gems < E.bribeCost) return false;
    S.gems -= E.bribeCost; S.heat--; save(); return true;
  }
  function skillState(s) {
    if (has(s.id)) return 'owned';
    if (s.req && !has(s.req)) return 'blocked';
    if (S.lv < s.lv) return 'locked';
    return S.sp > 0 ? 'ready' : 'nopoint';
  }
  function learn(id) {
    const s = skillById[id];
    if (!s || skillState(s) !== 'ready') return false;
    S.skills.push(id); S.sp--; ensureQuest(); save(); return true;
  }
  function buy(id) {
    const t = toolById[id];
    if (!t || S.tools.includes(id) || S.money < t.price) return false;
    S.money -= t.price; S.tools.push(id); save(); return true;
  }

  // Ekip
  const crewSlots = () => (E.crewSlots || []).filter(l => S.lv >= l).length;
  const crewCount = () => Object.keys(S.crew).length;
  const crewCut = () => Object.keys(S.crew).reduce((a, id) => a + (crewById[id] ? crewById[id].cut : 0), 0);
  const trainCost = c => S.crew[c.id] && S.crew[c.id] < 3 ? c.train[S.crew[c.id] - 1] : null;
  function crewState(c) {
    if (S.crew[c.id]) return 'hired';
    if (S.lv < c.lv) return 'locked';
    if (crewCount() >= crewSlots()) return 'full';
    return S.money >= c.hire ? 'ready' : 'poor';
  }
  function hire(id) {
    const c = crewById[id];
    if (!c || crewState(c) !== 'ready') return false;
    S.money -= c.hire; S.crew[id] = 1; bump('hire'); save(); return true;
  }
  function train(id) {
    const c = crewById[id], cost = c && trainCost(c);
    if (!cost || S.money < cost) return false;
    S.money -= cost; S.crew[id]++; bump('train'); save(); return true;
  }
  function dismiss(id) {
    if (!S.crew[id]) return false;
    delete S.crew[id]; save(); return true;
  }

  // Karaborsa
  const immediate = it => ['heatDown', 'heatClear', 'cdReset'].includes(it.kind);
  function market() {
    if (!M) return null;
    if (!S.market || S.market.day !== S.day) {
      const pool = M.items.filter(i => S.lv >= (i.lv || 1)).map(i => [Math.random(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]).slice(0, M.stockSize);
      const cash = pool.map((it, i) => i).filter(i => !pool[i].gems), deal = cash.length ? cash[Math.floor(Math.random() * cash.length)] : -1;
      const scale = 1 + (M.priceGrowth || 0.12) * (S.lv - 1);
      S.market = {
        day: S.day, rumor: M.rumors[Math.floor(Math.random() * M.rumors.length)],
        stock: pool.map((it, i) => {
          if (it.gems) return { id: it.id, gems: it.gems, sold: false };
          const full = Math.round(it.price * scale * (0.8 + Math.random() * 0.45) / 5) * 5;
          return { id: it.id, price: i === deal ? Math.round(full * 0.6 / 5) * 5 : full, full, deal: i === deal, sold: false };
        }),
      };
      save();
    }
    return S.market;
  }
  function marketState(i) {
    const e = market().stock[i], it = itemById[e.id];
    if (e.sold) return 'sold';
    if (!immediate(it) && S.buffs.includes(it.id)) return 'active';
    if (it.kind === 'cdReset' && !Object.values(S.cooldown).some(d => d > S.day)) return 'useless';
    if ((it.kind === 'heatDown' || it.kind === 'heatClear') && S.heat === 0) return 'useless';
    return (e.gems ? S.gems >= e.gems : S.money >= e.price) ? 'ready' : 'poor';
  }
  function buyMarket(i) {
    if (marketState(i) !== 'ready') return null;
    const e = S.market.stock[i], it = itemById[e.id];
    if (e.gems) S.gems -= e.gems; else S.money -= e.price;
    if (it.kind === 'heatDown') S.heat = Math.max(0, S.heat - it.v);
    else if (it.kind === 'heatClear') S.heat = 0;
    else if (it.kind === 'cdReset') S.cooldown = {};
    else S.buffs.push(it.id);
    e.sold = true; bump('market'); save();
    return it;
  }
  const gemRates = () => M ? { sell: M.gemSell * S.lv, buy: M.gemBuy * S.lv } : null;
  function sellGem() { if (S.gems < 1) return false; S.gems--; S.money += gemRates().sell; save(); return true; }
  function buyGem() { const c = gemRates().buy; if (S.money < c) return false; S.money -= c; S.gems++; save(); return true; }
  const activeBuffs = () => S.buffs.map(id => itemById[id]).filter(Boolean);

  // Şehirler
  const heatLabel = () => (cityById[S.city] || {}).heat || E.labels.heat;
  function cityState(c) {
    if (c.id === S.city) return 'here';
    if (S.cities.includes(c.id)) return 'open';
    if (S.lv < (c.lv || 1)) return 'locked';
    return S.money >= (c.cost || 0) ? 'buy' : 'poor';
  }
  function travel(id) {
    const c = cityById[id];
    if (!c || S.heist) return false;
    const st = cityState(c);
    if (st === 'here' || st === 'locked' || st === 'poor') return false;
    if (st === 'buy') { S.money -= c.cost || 0; S.cities.push(id); }
    S.heatBy[S.city] = S.heat; S.city = id; S.heat = S.heatBy[id] || 0;
    save(); return true;
  }

  // Efsane koleksiyonu
  function checkSets() {
    const done = [];
    (COL ? COL.sets : []).forEach(st => {
      if (S.setsDone[st.id]) return;
      if (COL.items.filter(i => i.set === st.id).every(i => S.collection[i.id])) { S.setsDone[st.id] = true; S.fame += st.fame || 0; done.push(st); }
    });
    return done;
  }
  function legendOffer() {
    if (!COL) return null;
    if (!S.legendOffer || S.legendOffer.day !== S.day) {
      const pool = COL.items.filter(i => i.price && !S.collection[i.id] && S.lv >= (i.lv || 1));
      const id = pool.length && Math.random() < (COL.offerChance || 0.4) ? pool[Math.floor(Math.random() * pool.length)].id : null;
      S.legendOffer = { day: S.day, id, sold: false };
      save();
    }
    const o = S.legendOffer;
    return o.id && !o.sold && !S.collection[o.id] ? colItemById[o.id] : null;
  }
  function buyLegend() {
    const it = legendOffer();
    if (!it || S.money < it.price) return null;
    S.money -= it.price; S.collection[it.id] = true; S.legendOffer.sold = true;
    const sets = checkSets(); save();
    return { it, sets };
  }

  // Ustalık
  function masteryState(m) {
    const n = (S.mastery || {})[m.id] || 0;
    if (S.lv < MA.lv) return 'locked';
    if (m.max && n >= m.max) return 'maxed';
    return S.sp > 0 ? 'ready' : 'nopoint';
  }
  function learnMastery(id) {
    const m = masteryById[id];
    if (!m || masteryState(m) !== 'ready') return false;
    S.mastery[id] = (S.mastery[id] || 0) + 1; S.sp--; save(); return true;
  }

  load(); ensureQuest();
  const awayAtLoad = awayCheck(); // açılışta bir kez: sonucu arayüz gösterir

  window.Game = {
    get s() { return S; }, E, away: awayAtLoad,
    cities: CITIES, cityById, cityOf, cityState, travel, heatLabel, legendOffer, buyLegend, colItemById, colSetById,
    security, lootRange, xpFor, masteryById, masteryState, learnMastery,
    tierById, targetById, skillById, toolById, crewById, itemById,
    market, marketState, buyMarket, gemRates, sellGem, buyGem, activeBuffs, immediate,
    crewSlots, crewCount, crewCut, crewState, trainCost, hire, train, dismiss,
    xpCap, tierOpen, targetOpen, cooldownLeft, scoutCost, requirements, odds, dateOf,
    routes: ROUTES, routeById, routeOpen, routePreview, cosList, cosOwned, cosEquipped, cosLook, equipCos, buyCos,
    tonight, nightP, chooseMini, miniSetup, fenceById, fenceOffer, haggle, haggleChance, sellGood,
    achById, achState, checkAch, touch, awayCheck, crewEarnings, dailyState, claimDaily, quest, questDone, claimQuest, skillState, canSkipQuest, skipQuest, canAd, adReward, addGems,
    pickPattern, rob, startHeist, heistStatus, finishHeist, rushCost, rush, rushAdsLeft, RUSH_AD_MAX, heistTimes, baseTimes, choose, choiceChance, choicePenalty, choiceOpen, reqText, rushTarget,
    scout, rest, bribe, learn, buy, reset, markSeen,
  };
})();
