// Arayüz. Metin ve isimleri ERA'dan, durumu Game'den okur.
(function () {
  const G = window.Game, E = G.E;
  const $ui = document.getElementById('ui'), $layer = document.getElementById('layer');
  const ui = { screen: 'hedef', tier: E.tiers[0].id, sel: null, modal: null }; // yeni oyunculara karşılama penceresi yerine başlangıç turu (tutorial.js) gösterilir

  const fmt = n => Math.round(n).toLocaleString('tr-TR');
  const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const k = x => (x / 1000).toFixed(1).replace('.0', '').replace('.', ',');
  const range = (a, b) => b >= 1000 ? `${k(a)}–${k(b)} bin` : `${a}–${b}`;
  const ic = (name, color) => `<i class="ti ti-${name}"${color ? ` style="color:var(--${color})"` : ''} aria-hidden="true"></i>`;
  // Ödüllü reklam düğmesi: reklamlar kapalıysa ya da ödül şu an alınamıyorsa hiç görünmez.
  const adBtn = (key, label, res) => (window.Ads && Ads.enabled() && G.canAd(key, res))
    ? `<button class="b2 adbtn" data-ad="${key}">${ic('player-play')}<span>${label}</span><span class="adtag">Reklam</span></button>` : '';
  // Ses kısayolları
  const snd = (n, d) => { if (window.Sound) Sound.play(n, d); };
  function resultSound(r) {
    snd(r.aborted ? 'fail' : r.legend ? 'legend' : r.ok ? 'success' : r.caught ? 'caught' : r.heatUp ? 'whistle' : 'fail');
    if ((r.broken || []).length) snd('break', 0.7);
    if (r.levelUps) snd('levelup', r.legend ? 1.8 : 1.0);
  }
  // Gecenin etkilerini okunur satırlara çevir
  function nightLines(n) {
    const f = n.fx || {}, out = [];
    const where = f.tiers ? ' (' + f.tiers.map(id => (E.tiers.find(x => x.id === id) || {}).name || id).join(', ').toLocaleLowerCase('tr-TR') + ')' : '';
    if (f.p) out.push({ icon: 'target', tone: f.p > 0 ? 'ok' : 'no', text: `Başarı şansı <b>${f.p > 0 ? '+' : ''}${f.p}</b>${where}` });
    if (f.heat) out.push({ icon: 'urgent', tone: f.heat < 1 ? 'ok' : 'no', text: `Fark edilme riski <b>%${Math.round(Math.abs(1 - f.heat) * 100)} ${f.heat < 1 ? 'az' : 'fazla'}</b>` });
    if (f.time) out.push({ icon: 'hourglass', tone: f.time < 1 ? 'ok' : 'wa', text: `Soygunlar <b>%${Math.round(Math.abs(1 - f.time) * 100)} ${f.time < 1 ? 'kısa' : 'uzun'}</b> sürer` });
    if (f.loot) out.push({ icon: 'coins', tone: 'au', text: `Ganimet <b>%${Math.round(f.loot * 100)} fazla</b>` });
    if (f.xp) out.push({ icon: 'bolt', tone: 'xp', text: `Tecrübe <b>%${Math.round(f.xp * 100)} fazla</b>` });
    return out;
  }

  // ---- Mini oyunlar: kilit (gösterge yeşil alanda durdurulur) ve kasa (çark tıkladığında durdurulur) ----
  let mg = null, mgRaf = 0;
  function mgStart() {
    const st = G.heistStatus(); if (!st || !st.pending || !st.pending.mini) return;
    const kind = st.pending.mini.kind, cfg = G.miniSetup(kind);
    mg = { kind, cfg, step: 0, misses: 0, pos: 0, dir: 1, t0: performance.now(), last: performance.now(), done: false, won: false, inWin: false, flash: '' };
    mgNew();
    cancelAnimationFrame(mgRaf); mgRaf = requestAnimationFrame(mgLoop);
  }
  function mgNew() {
    if (mg.kind === 'lock') { // her başarılı pimde yeşil alan daralır, ibre hızlanır
      mg.zw = mg.cfg.zone * Math.pow(0.8, mg.step); mg.sp = mg.cfg.speed * Math.pow(1.25, mg.step);
      mg.zs = 0.08 + Math.random() * (0.84 - mg.zw);
    }
    else { // kasa: her rakamda yön değişir; yeni rakam en az çeyrek tur uzakta başlar
      mg.target = (mg.pos + mg.dir * -1 * (90 + Math.random() * 180) + 720) % 360; mg.dir = mg.step % 2 ? -1 : 1; mg.win = 8 + mg.cfg.zone * 60; mg.inWin = false;
    }
  }
  const angDist = (a, b) => { const d = Math.abs(((a - b) % 360 + 540) % 360 - 180); return d; };
  function mgLoop(now) {
    if (!mg || mg.done || !ui.modal || ui.modal.type !== 'mini') return;
    const dt = Math.min(0.05, (now - mg.last) / 1000); mg.last = now;
    if (mg.kind === 'lock') {
      mg.pos += mg.dir * dt * mg.sp * 0.9;
      if (mg.pos > 1) { mg.pos = 1; mg.dir = -1; } if (mg.pos < 0) { mg.pos = 0; mg.dir = 1; }
      const n = document.querySelector('.mneedle'); if (n) n.style.left = (mg.pos * 100) + '%';
    } else {
      mg.pos = (mg.pos + mg.dir * dt * mg.cfg.speed * 110 + 360) % 360;
      const f = document.querySelector('.dialface'); if (f) f.style.transform = `rotate(${-mg.pos}deg)`;
      const inWin = angDist(mg.pos, mg.target) < mg.win / 2;
      if (inWin && !mg.inWin) { snd('tick'); }
      mg.inWin = inWin;
      const d = document.querySelector('.dial'); if (d) d.classList.toggle('click', inWin);
    }
    mgRaf = requestAnimationFrame(mgLoop);
  }
  function mgTap() {
    if (!mg || mg.done) return;
    const hit = mg.kind === 'lock' ? (mg.pos >= mg.zs && mg.pos <= mg.zs + mg.zw) : mg.inWin;
    if (hit) { mg.step++; mg.flash = 'hit'; snd(mg.kind === 'lock' ? 'pick' : 'clink'); if (window.Haptic) Haptic.play('medium'); }
    else { mg.misses++; mg.flash = 'miss'; snd('bad'); }
    if (mg.step >= mg.cfg.steps) { mg.done = true; mg.won = true; }
    else if (mg.misses > mg.cfg.misses) { mg.done = true; mg.won = false; }
    else if (hit) mgNew();
    if (mg.done) {
      cancelAnimationFrame(mgRaf);
      if (mg.won) snd('unlock');
      const won = mg.won;
      setTimeout(() => {
        if (!ui.modal || ui.modal.type !== 'mini') return;
        const o = G.chooseMini(won); mg = null;
        if (o) { ui.modal = o.result ? { type: 'result', r: o.result } : { type: 'outcome', o }; if (o.result) resultSound(o.result); else snd(won ? 'good' : 'bad'); }
        else ui.modal = null;
        render();
      }, 750);
    }
  }

  function mgPaint(st = mg) {
    if (!st) return;
    const $m = $ui.querySelector('.modal'); if (!$m) return;
    $m.querySelectorAll('.pin').forEach((p, i) => p.classList.toggle('on', i < st.step));
    $m.querySelectorAll('.life').forEach((l, i) => l.classList.toggle('gone', i < st.misses));
    const b = $m.querySelector('.mtrack, .dial');
    if (b && st.flash) { b.classList.remove('hit', 'miss'); void b.offsetWidth; b.classList.add(st.flash); }
    st.flash = '';
    const z = $m.querySelector('.mzone'); if (z && st.kind === 'lock') { z.style.left = (st.zs * 100) + '%'; z.style.width = (st.zw * 100) + '%'; }
    const c = $m.querySelector('[data-act=minicancel]'); if (c && (st.step || st.misses)) c.remove();
    if (st.done) {
      $m.querySelector('[data-act=mtap].b1')?.classList.add('off');
      if (b && !$m.querySelector('.mres')) b.insertAdjacentHTML('afterend', `<div class="mres ${st.won ? 'ok' : 'no'}">${st.won ? (st.kind === 'lock' ? 'Açıldı!' : 'Kasa açıldı!') : 'Olmadı...'}</div>`);
    }
  }
  // Tek seferlik ipuçları: oyuncu "Anladım" der ya da ekrandan/pencereden ayrılınca bir daha görünmez.
  const tipsShown = new Set();
  function tip(key, text) {
    if ((G.s.seen || {})['tip_' + key]) return '';
    tipsShown.add(key);
    return `<div class="tip">${ic('bulb', 'au')}<span>${text}</span><button class="tipx" data-tip="${key}">Anladım</button></div>`;
  }
  function markTips() { tipsShown.forEach(k => G.markSeen('tip_' + k)); tipsShown.clear(); }
  const shopOn = () => window.Shop && Shop.enabled();
  const diff = p => p >= 70 ? ['Kolay', 'ok', '#3ccf8e22'] : p >= 45 ? ['Orta', 'wa', '#ffb54722'] : ['Zor', 'no', '#ff6b5b22'];

  function scene(type, mode) {
    const P = mode === 'dim'
      ? { sky: '#161d33', bl: '#20263a', w: '#3a4058', d: '#2c3348', moon: '#2c3348', st: .15 }
      : { sky: '#1b2d63', bl: '#0b1228', w: '#f5c451', d: '#2a3b70', moon: '#e9edf8', st: .55 };
    const draw = E.scenes[type] || Object.values(E.scenes)[0];
    const seed = [...type].reduce((a, c) => a + c.charCodeAt(0), 0);
    const stars = Array.from({ length: 7 }, (_, i) =>
      `<circle cx="${(seed * 37 + i * 53) % 200}" cy="${(seed * 13 + i * 29) % 30 + 3}" r="${i % 3 ? .8 : 1.2}" fill="#fff" opacity="${P.st}"/>`).join('');
    const mx = 118 - (seed % 30); // şans rozetinin arkasına girmesin
    return `<svg viewBox="0 0 200 72" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><rect width="200" height="72" fill="${P.sky}"/>${stars}<circle cx="${mx}" cy="14" r="7" fill="${P.moon}"/><circle cx="${mx + 3}" cy="12" r="6" fill="${P.sky}"/>${draw(P)}<rect y="68" width="200" height="4" fill="${P.bl}"/></svg>`;
  }

  function ring(p) {
    const r = 25, L = 2 * Math.PI * r, c = `var(--${diff(p)[1]})`;
    return `<svg viewBox="0 0 64 64" width="62" height="62" style="flex-shrink:0" role="img" aria-label="Başarı şansı yüzde ${p}"><circle cx="32" cy="32" r="${r}" fill="none" stroke="#24376b" stroke-width="6"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${L * p / 100} ${L}" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle" font-size="15" font-weight="500" fill="#f2f5ff" font-family="Inter, sans-serif">%${p}</text></svg>`;
  }

  // Soygun ilerlemesi
  function hchip() {
    const st = G.heistStatus();
    if (!st) return '';
    const ph = E.heist.phases[Math.min(st.phase, E.heist.phases.length - 1)];
    if (st.pending) return `<button class="hchip alert" data-act="openevent">${ic('alert-triangle')}<span>Karar bekliyor</span></button>`;
    return `<button class="hchip" data-act="goheist">${ic(ph.icon)}<span>${ph.name}</span><b data-htotal>${mmss(st.totalLeft)}</b></button>`;
  }
  function heistPanel() {
    const st = G.heistStatus(), H = E.heist, c = G.rushCost();
    const rows = H.phases.map((ph, i) => {
      const state = i < st.phase ? 'done' : i === st.phase ? 'now' : 'wait';
      const time = state === 'done' ? 'Tamam' : state === 'now' ? mmss(st.phaseLeft) : mmss(G.s.heist.times[i]);
      return `<div class="ph ${state}"><div class="pic">${ic(state === 'done' ? 'check' : ph.icon)}</div><div style="flex:1;min-width:0">
        <div class="row"><span class="pn">${ph.name}</span><span class="mini" ${state === 'now' ? 'data-hleft' : ''}>${time}</span></div>
        ${state === 'now' ? `<div class="bar"><i data-hbar style="width:${Math.round(st.phaseProg * 100)}%"></i></div>` : ''}</div></div>`;
    }).join('');
    const cur = H.phases[Math.min(st.phase, H.phases.length - 1)], last = st.log && st.log[st.log.length - 1];
    const info = `<div class="row" style="margin-top:8px"><span class="mini">${ic('target')}Şu anki şans</span><b style="font-weight:500;color:var(--${diff(st.p)[1]})">%${st.p}</b></div>`
      + (last ? `<div class="lastev">${ic(last.roll ? (last.ok ? 'circle-check' : 'alert-triangle') : 'point', last.roll ? (last.ok ? 'ok' : 'no') : 'mu')}<span><b>${last.title}:</b> ${last.text}</span></div>` : '');
    if (st.pending) return [`<div class="heist">${rows}${info}</div>`, `<button class="b1" data-act="openevent">${ic('alert-triangle')} Karar bekliyor</button>`];
    return [tip('heist', 'Soygun sürerken başka ekranlara bakabilir, hatta oyundan çıkabilirsin; iş devam eder. Acelen varsa elmasla hızlandırabilirsin.') + `<div class="heist">${rows}<p class="ptext">${cur.text}</p>${info}</div>`,
      adBtn('rush', 'İzle, hemen ilerle') + `<button class="b2 ${G.s.gems < c ? 'off' : ''}" ${G.s.gems >= c ? 'data-act="rush"' : ''} style="margin:0">${ic('bolt', 'gem')}Hızlandır · <span data-hrush>${c}</span> ${E.gemName} <span class="mini" style="margin-left:6px">kalan <span data-htotal>${mmss(st.totalLeft)}</span></span></button>`];
  }

  // Üst çubuk ve menü
  function top() {
    const S = G.s, cap = G.xpCap(S.lv), q = G.quest(), done = G.questDone();
    const prog = Math.min(S.quest.prog, q.n);
    return `<header class="top">
      ${(() => { const lk = G.cosLook(); return `<button class="ava" data-act="wardrobe" aria-label="Görünüm" style="${lk.bg ? `background:${lk.bg};` : ''}${lk.fg ? `color:${lk.fg}` : ''}">${ic(lk.icon)}<span class="lv">Sv ${S.lv}</span></button>`; })()}
      <div class="who"><div class="nm">${E.hero}</div><div class="bar"><i style="width:${Math.round(S.xp / cap * 100)}%"></i></div><div class="xt">${fmt(S.xp)} / ${fmt(cap)} tecrübe</div></div>
      <div class="res" title="Para">${ic('coins', 'au')}${fmt(S.money)}</div>
      ${shopOn() ? `<button class="res gembuy" data-act="shop" title="Elmas al" aria-label="Elmas al">${ic('diamond', 'gem')}${S.gems}<span class="plus">${ic('plus')}</span></button>` : `<div class="res" title="Elmas">${ic('diamond', 'gem')}${S.gems}</div>`}
      <div class="res fame" title="Ün">${ic('star', 'au')}${S.fame}</div>
      <div class="res" title="${G.heatLabel()}">${ic('urgent', 'no')}${S.heat}/5</div>
      ${hchip()}
      <div class="quest" title="Görev">
        <div class="qopen" data-act="quest" role="button" aria-label="Görev ayrıntıları"><div style="min-width:0"><div class="qt">${q.text}</div><div class="bar qb"><i style="width:${Math.round(prog / q.n * 100)}%"></i></div></div>
        <span class="mini">${fmt(prog)}/${fmt(q.n)}</span></div>
        <button class="gift ${done ? 'ready' : ''}" ${done ? 'data-act="claim"' : ''} aria-label="Görev ödülü">${ic('gift')}</button>
      </div>
      <button class="icon-btn achbtn" data-act="ach" aria-label="Başarımlar">${ic('trophy')}<span class="achn">${Object.keys(S.ach || {}).length}</span></button>
      <button class="icon-btn" data-act="menu" aria-label="Ayarlar">${ic('settings')}</button>
    </header>`;
  }

  function rail() {
    const S = G.s;
    const items = [['hedef', 'map-2', 'Hedef'], ['yetenek', 'chart-arrows', 'Yetenek', S.sp], ['alet', 'tool', 'Alet'], ['karaborsa', 'building-warehouse', 'Karaborsa', (S.goods || []).length], ['koleksiyon', 'crown', 'Koleksiyon', G.legendOffer() ? 1 : 0], ['gazete', 'news', 'Gazete'], ['ekip', 'users', 'Ekip', E.crew.filter(c => G.crewState(c) === 'ready').length]];
    return `<nav class="rail">${items.map(([id, icon, name, badge, soon]) =>
      `<button class="ri ${ui.screen === id ? 'on' : ''} ${soon ? 'soon' : ''}" data-go="${id}">${badge ? `<span class="bdg">${badge}</span>` : ''}${ic(icon)}${name}</button>`).join('')}</nav>`;
  }

  // Hedef ekranı
  function card(t) {
    const open = G.targetOpen(t), cd = G.cooldownLeft(t), sel = ui.sel === t.id;
    if (!open) {
      const miss = G.requirements(t).filter(r => !r.ok).map(r => r.text).join(' · ');
      return `<button class="card dim ${sel ? 'sel' : ''}" data-sel="${t.id}"><div class="th">${scene(t.scene, 'dim')}<div class="ov"><span class="pill">${ic('lock')}${miss}</span></div></div>
        <div class="info"><div class="row"><span class="nm">${t.name}</span></div><div class="mini" style="margin-top:4px">${ic('map-pin')}${t.place}</div></div></button>`;
    }
    const p = G.odds(t).p, d = diff(p), hs = G.heistStatus(), here = hs && hs.id === t.id;
    return `<button class="card ${sel ? 'sel' : ''} ${cd ? 'dim' : ''}" data-sel="${t.id}"><div class="th">${scene(t.scene, 'on')}${here
      ? `<div class="ov"><span class="pill" style="color:var(--au);border-color:var(--au)">${ic('run')}İş sürüyor</span></div>`
      : cd ? `<div class="ov"><span class="pill">${ic('moon')}Soyuldu · ${cd} gece</span></div>`
      : `<span class="pc" style="color:var(--${d[1]})">%${p}</span>`}${G.security(t) ? `<span class="secb">${ic('shield-lock')}${G.security(t)}</span>` : ''}</div>
      <div class="info"><div class="row"><span class="nm">${t.name}</span><span class="tag" style="background:${d[2]};color:var(--${d[1]})">${d[0]}</span></div>
      <div class="row" style="margin-top:4px"><span class="mini">${ic('map-pin')}${t.place}</span><span class="mini">${ic('coins', 'au')}${range(G.lootRange(t)[0], G.lootRange(t)[1])}</span></div></div></button>`;
  }

  function rewards(t) {
    const lr = G.lootRange(t);
    return `<div class="rewards"><div class="rw">${ic('coins', 'au')} ${range(lr[0], lr[1])}</div><div class="rw">${ic('bolt', 'xp')} ${fmt(G.xpFor(t))}</div><div class="rw">${ic('star', 'au')} +${t.fame}</div></div>`;
  }

  // Hedef paneli: bilgiler kendi alanında kayar, düğmeler altta ayrı durur (üst üste binmez).
  const panel = (info, actions) => `<div class="dinfo scroll">${info}</div><div class="actions">${actions}</div>`;
  function detail(t) {
    const S = G.s, open = G.targetOpen(t), cd = G.cooldownLeft(t), tr = G.tierById[t.tier];
    const o = open ? G.odds(t) : null;
    const tagName = G.cityOf(t) === G.cities[0].id ? tr.name : G.cityById[G.cityOf(t)].name;
    let h = `<div class="scene">${scene(t.scene, open ? 'on' : 'dim')}<span class="tag">${tagName}</span></div>
      <div class="row" style="margin-top:12px;align-items:flex-start"><div style="min-width:0"><h2>${t.name}</h2><div class="mini" style="margin-top:3px">${ic('map-pin')}${t.place}</div></div>${o ? ring(o.p) : ''}</div>
      <p class="desc">${t.desc}</p>`;
    if (!open) {
      return panel(h + `<div class="mini" style="margin-bottom:4px">Bu hedef için gerekenler</div>`
        + G.requirements(t).map(r => `<div class="req">${ic(r.ok ? 'circle-check' : 'lock', r.ok ? 'ok' : 'mu')}${r.text}</div>`).join('')
        + rewards(t), `<button class="b1 off">Kilitli</button>`);
    }
    h += o.rows.map(r => {
      const col = r.base ? 'tx' : r.canceledBy ? 'mu' : r.v > 0 ? 'ok' : 'no';
      const val = r.base ? '%' + r.v : r.canceledBy ? '0' : (r.v > 0 ? '+' : '−') + Math.abs(r.v);
      return `<div class="fr ${r.canceledBy ? 'cx' : ''}">${ic(r.icon)}<span>${r.text}</span>${r.canceledBy ? `<small>${r.canceledBy}</small>` : ''}<b style="color:var(--${col})">${val}</b></div>`;
    }).join('');
    h += rewards(t);
    const notes = G.activeBuffs().filter(it => it.kind !== 'nextBonus');
    if (notes.length) h += notes.map(it => `<div class="mini" style="margin:-4px 0 6px;color:var(--au)">${ic(it.icon)}${it.name}</div>`).join('');
    const cut = G.crewCut();
    if (cut > 0) h += `<div class="mini" style="margin:-4px 0 6px">${ic('users')}Ekip payı: ganimetin %${Math.round(cut * 100)}'i</div>`;
    const hs = G.heistStatus();
    if (hs && hs.id === t.id) { const [hp, hb] = heistPanel(); return panel(h + hp, hb); }
    if (cd) {
      return panel(h, `<div class="mini" style="justify-content:center;margin-bottom:8px">${ic('moon')}Ortalık sakinleşsin: ${cd} gece</div>
        ${hs ? '' : `<button class="b2" data-act="rest">${ic('zzz')}${E.labels.rest}</button>`}<button class="b1 off">Bekleniyor</button>`);
    }
    const cost = G.scoutCost(t);
    const scoutBtn = S.scouted[t.id]
      ? `<button class="b2 off">${ic('eye-search')}Keşif yapıldı</button>`
      : `<button class="b2 ${S.money < cost ? 'off' : ''}" data-act="scout">${ic('eye-search')}${E.labels.scout} · ${ic('coins', 'au')}${fmt(cost)}</button>`;
    const robBtn = hs
      ? `<button class="b1 off">${E.heist.busy}</button>`
      : `<button class="b1" data-act="rob">${E.labels.rob} · ${mmss(G.heistTimes(t).reduce((a, b) => a + b, 0))}</button>`;
    return panel(h, scoutBtn + robBtn);
  }

  function cityBar() {
    if (G.cities.length < 2) return '';
    return `<div class="cities">${G.cities.map(c => {
      const st = G.cityState(c);
      const icon = st === 'here' ? 'map-pin' : st === 'open' ? 'plane' : st === 'locked' ? 'lock' : 'ticket';
      return `<button class="city ${st}" data-city="${c.id}">${ic(icon)}${c.name}${st === 'locked' ? `<span class="cnt">Sv ${c.lv}</span>` : ''}</button>`;
    }).join('')}</div>`;
  }
  function scrHedef() {
    const city = G.s.city, home = city === G.cities[0].id;
    const list = E.targets.filter(t => G.cityOf(t) === city && (!home || t.tier === ui.tier));
    if (!ui.sel || !list.some(t => t.id === ui.sel)) {
      ui.sel = (list.find(t => G.targetOpen(t) && !G.cooldownLeft(t)) || list.find(t => G.targetOpen(t)) || list[0]).id;
    }
    const tabs = home ? E.tiers.map(tr => {
      const open = G.tierOpen(tr.id), n = E.targets.filter(t => t.tier === tr.id && G.cityOf(t) === city).length;
      return `<button class="tab ${tr.id === ui.tier ? 'on' : ''} ${open ? '' : 'lockd'}" data-tier="${tr.id}">${ic(open ? tr.icon : 'lock')}${tr.name}<span class="cnt">${n}</span></button>`;
    }).join('') : `<div class="mini" style="white-space:normal">${ic('info-circle')}${G.cityById[city].info || ''}</div>`;
    const nt = G.tonight();
    const nchip = nt ? `<button class="nightchip" data-act="night" title="Bu gece">${ic(nt.icon)}${nt.name}</button>` : '';
    return `<div class="targets"><div class="main">${cityBar()}<div class="tabs">${tabs}${nchip}</div><div class="grid scroll" style="flex:1;min-height:0">${list.map(card).join('')}</div></div>
      <aside class="detail">${detail(G.targetById[ui.sel])}</aside></div>`;
  }

  // Yetenek ekranı
  function node(s) {
    const st = G.skillState(s);
    const ft = {
      owned: `<span style="color:var(--au)">${ic('check')} Öğrenildi</span>`,
      ready: `<span>Seviye ${s.lv}</span><button class="sbtn" data-learn="${s.id}">Öğren</button>`,
      nopoint: `<span>Seviye ${s.lv}</span><span>Puan gerekli</span>`,
      locked: `<span>${ic('lock')} Seviye ${s.lv}</span>`,
      blocked: `<span>${ic('lock')} Önce: ${s.req ? G.skillById[s.req].name : ''}</span><span>Sv ${s.lv}</span>`,
    }[st];
    return `<div class="node ${st}"><div class="hd"><div class="ic">${ic(s.icon)}</div><div><div class="nm">${s.name}</div><div class="ds">${s.desc}</div></div></div><div class="ft">${ft}</div></div>`;
  }
  function scrYetenek() {
    return `<div class="page scroll"><div class="page-h"><div><h1>Yetenekler</h1><p>Her seviyede bir puan kazanırsın. Yetenekler şansını artırır, bazıları yeni hedef kademelerini açar.</p></div><div class="sp-chip">Harcanabilir puan: <b>${G.s.sp}</b></div></div>
      ${tip('yetenek', `Her seviye atlayışında 1 yetenek puanı kazanırsın. Kasa kulağı dükkânları, Kılık değiştirme mağazaları, Sahte kimlik müzeleri açar. Seviye ${E.mastery ? E.mastery.lv : 8}'de sınırsız gelişen Ustalık açılır.`)}
      <div class="branches">${E.branches.map(b => `<div><div class="branch-h">${ic(b.icon)}${b.name}</div>${E.skills.filter(s => s.branch === b.id).map(node).join('')}</div>`).join('')}</div>
      ${E.mastery ? masteryBlock() : ''}</div>`;
  }
  function masteryBlock() {
    const MA = E.mastery, S = G.s;
    return `<div class="page-h" style="margin:26px 0 12px"><div><h1 style="font-size:17px">${ic('infinity', 'au')} ${MA.title}</h1><p>${MA.info}</p></div>${S.lv < MA.lv ? `<div class="sp-chip">${ic('lock')} Seviye ${MA.lv}'te açılır</div>` : ''}</div>
      <div class="shop">${MA.items.map(m => {
        const st = G.masteryState(m), n = (S.mastery || {})[m.id] || 0;
        const btn = st === 'ready' ? `<button class="sbtn" data-mastery="${m.id}">Geliştir</button>`
          : st === 'maxed' ? `<span style="color:var(--au)">${ic('crown')} En üst</span>`
          : st === 'locked' ? `<span>${ic('lock')} Sv ${MA.lv}</span>` : `<span>Puan gerekli</span>`;
        return `<div class="node ${st === 'locked' ? 'locked' : n ? 'owned' : ''}" style="margin:0"><div class="hd"><div class="ic">${ic(m.icon)}</div><div><div class="nm">${m.name}</div><div class="ds">${m.per}</div></div></div>
          <div class="ft"><span>${n}${m.max ? ' / ' + m.max : ''}</span>${btn}</div></div>`;
      }).join('')}</div>`;
  }

  // Alet ekranı
  function scrAlet() {
    const S = G.s;
    return `<div class="page scroll"><div class="page-h"><div><h1>Aletler</h1><p>Aletlerini her işte yanında taşırsın.</p></div><div class="sp-chip">${ic('coins', 'au')} <b>${fmt(S.money)}</b> ${E.currency}</div></div>
      ${tip('alet', 'Aletler hedeflerin engellerini kaldırır ya da şansını artırır. Hangi engeli kaldırdığı açıklamasında yazar; hedefin sağ panelinde de görürsün.')}
      <p class="mini" style="white-space:normal;margin:-6px 0 14px">${ic('info-circle')}Aletler bir işte işe yararsa yıpranır; bazen kırılır. Kırılan aleti buradan yeniden alabilirsin.</p>
      <div class="shop">${E.tools.map(t => {
        const own = S.tools.includes(t.id);
        const btn = own ? `<button class="buy off">${ic('check')}Sende var</button>`
          : `<button class="buy ${S.money < t.price ? 'off' : ''}" data-buy="${t.id}">${ic('coins')}${fmt(t.price)} ${E.currency}</button>`;
        const wear = t.uses ? `<div class="mini wear">${ic('refresh')}Tek kullanımlık · her işte biter</div>`
          : t.brk ? `<div class="mini wear">${ic('hammer')}Kullanıldığı işte %${Math.round(t.brk * 100)} kırılma ihtimali</div>` : '';
        return `<div class="item ${own ? 'owned' : ''}"><div class="hd"><div class="ic">${ic(t.icon)}</div><div><div class="nm">${t.name}</div><div class="ds">${t.desc}</div></div></div>${wear}${btn}</div>`;
      }).join('')}</div></div>`;
  }

  // Gazete ekranı
  function scrGazete() {
    const S = G.s, st = S.stats;
    const feed = S.news.map((n, i) => `<article class="news ${i === 0 ? 'lead' : ''}"><div class="d">${G.dateOf(n.day).toUpperCase()}</div><h3>${n.h}</h3><p>${n.b}</p></article>`).join('');
    const canBribe = S.heat > 0 && S.gems >= E.bribeCost;
    return `<div class="paper"><div class="feed scroll"><div class="mast"><h1>${E.labels.newspaper}</h1><span>${G.dateOf(S.day)}</span></div>${tip('gazete', 'Yaptığın her iş ertesi sabah gazetede çıkar. Sağdaki bölümde zabıta takibini görürsün: dinlenerek ya da komisere rüşvet vererek azaltabilirsin. Ayrıca kariyer istatistiklerin burada.')}${feed}</div>
      <aside class="side scroll">
        <h4>${G.heatLabel().toLocaleUpperCase('tr-TR')}</h4>
        <div class="heat">${[0, 1, 2, 3, 4].map(i => `<i class="${i < S.heat ? 'on' : ''}"></i>`).join('')}</div>
        <div style="font-weight:500;margin:8px 0 4px">${E.labels.heatLevels[S.heat]}</div>
        <p class="mini" style="white-space:normal;line-height:1.5;margin:0 0 12px">${E.labels.heatInfo}</p>
        ${adBtn('heat', 'Takibi 1 düşür')}
        <button class="b2 ${canBribe ? '' : 'off'}" ${canBribe ? 'data-act="bribe"' : ''}>${ic('diamond', 'gem')}${E.labels.bribe} · ${E.bribeCost}</button>
        <button class="b2 ${S.heist ? 'off' : ''}" ${S.heist ? '' : 'data-act="rest"'}>${ic('zzz')}${E.labels.rest}</button>
        <h4 style="margin-top:18px">KARİYER</h4>
        <div class="stat"><span>Toplam iş</span><b>${st.robs}</b></div>
        <div class="stat"><span>Başarı oranı</span><b>%${st.robs ? Math.round(st.ok / st.robs * 100) : 0}</b></div>
        <div class="stat"><span>Toplam ganimet</span><b>${fmt(st.loot)} ${E.currency}</b></div>
        <div class="stat"><span>Keşifler</span><b>${st.scouts}</b></div>
        <div class="stat"><span>Yakalanma</span><b>${st.caught}</b></div>
        <div class="stat"><span>Ün</span><b>${S.fame}</b></div>
      </aside></div>`;
  }

  function scrKoleksiyon() {
    const C = E.collection, S = G.s, offer = G.legendOffer();
    const sets = C.sets.map(st => {
      const items = C.items.filter(i => i.set === st.id), have = items.filter(i => S.collection[i.id]).length, done = !!S.setsDone[st.id];
      return `<div class="item ${done ? 'owned' : ''}"><div class="hd"><div class="ic">${ic(st.icon)}</div><div style="flex:1;min-width:0"><div class="row"><span class="nm">${st.name}</span><span class="mini">${have}/${items.length}</span></div><div class="ds" style="color:var(--${done ? 'au' : 'mu'})">${done ? ic('check') + ' ' : ''}${st.desc}</div></div></div>
        <div>${items.map(i => {
          const own = S.collection[i.id], tg = i.target && G.targetById[i.target];
          const src = own ? 'Koleksiyonunda' : tg ? `${tg.name} soygunundan çıkar` : `Kaçakçıda çıkabilir · ${fmt(i.price)} ${E.currency}${S.lv < (i.lv || 1) ? ` · Sv ${i.lv}` : ''}`;
          return `<div class="lg ${own ? 'own' : ''}">${ic(own ? i.icon : 'help-circle')}<div style="min-width:0"><div class="ln">${own ? i.name : i.name}</div><div class="mini" style="white-space:normal">${src}</div></div></div>`;
        }).join('')}</div></div>`;
    }).join('');
    const offerBox = offer
      ? `<div class="offer"><div class="ic">${ic(offer.icon)}</div><div style="flex:1;min-width:0"><div class="mini">BU GECE KAÇAKÇIDA · ${G.colSetById[offer.set].name}</div><div class="nm">${offer.name}</div></div>
          <button class="buy ${S.money < offer.price ? 'off' : ''}" ${S.money >= offer.price ? 'data-act="buylegend"' : ''}>${ic('coins')}${fmt(offer.price)} ${E.currency}</button></div>`
      : `<div class="offer empty">${ic('moon')}<span>Bu gece kaçakçıda efsanevi bir şey yok. Her gece yeniden bak.</span></div>`;
    const done = Object.keys(S.setsDone || {}).length;
    return `<div class="page scroll"><div class="page-h"><div><h1>${C.title}</h1><p>${C.info}</p></div><div class="sp-chip">Tamamlanan set: <b>${done}/${C.sets.length}</b></div></div>
      ${tip('koleksiyon', 'Efsanevi eşyaları topla. Bazıları büyük soygunlardan çıkar, bazılarını kaçakçı bazı geceler satar. Bir seti tamamlayınca kalıcı bir güç kazanırsın.')}
      ${offerBox}<div class="shop" style="margin-top:14px">${sets}</div></div>`;
  }

  // Karaborsa ekranının üstündeki sekme: mal al / mal sat
  function kbSeg() {
    const n = (G.s.goods || []).length;
    return `<div class="seg"><button class="${ui.kb !== 'fence' ? 'on' : ''}" data-act="kbm">${ic('building-warehouse')}Karaborsa</button><button class="${ui.kb === 'fence' ? 'on' : ''}" data-act="kbf">${ic('hand-finger')}${E.fenceTitle || 'Yatakçılar'}${n ? `<span class="cnt">${n}</span>` : ''}</button></div>`;
  }
  const catName = { antika: 'antika', mucevher: 'mücevher', esya: 'eşya' };
  function scrFence() {
    const S = G.s, goods = S.goods || [], GD = E.goods || {};
    const card = g => `<div class="item good">
      <div class="hd"><div class="ic">${ic(g.icon)}</div><div><div class="nm">${g.name}</div><div class="ds">${g.from} · ${catName[g.cat] || g.cat} · değeri ~${fmt(g.v)} ${E.currency}</div></div></div>
      <div class="offers">${E.fences.map(f => {
        const o = G.fenceOffer(f.id, g.uid);
        if (o.no) return `<div class="off na">${ic(f.icon)}<span class="fn">${f.short || f.name}</span><em>${o.no === 'only' ? 'Sadece antika alır' : 'Bu gece almıyor'}</em></div>`;
        const pct = Math.round(o.price / g.v * 100);
        return `<div class="off">${ic(f.icon)}<span class="fn">${f.short || f.name}${o.risk ? ` <span class="risk">${ic('urgent')}riskli</span>` : ''}</span>
          ${o.haggled ? `<span class="hg">${ic('check')}pazarlık</span>` : `<button class="b2 sm" data-act="haggle" data-f="${f.id}" data-g="${g.uid}">Pazarlık</button>`}
          <button class="buy sm ${pct >= 100 ? 'up' : 'down'}" data-act="sell" data-f="${f.id}" data-g="${g.uid}">${ic('coins')}${fmt(o.price)}<small>%${pct}</small></button></div>`;
      }).join('')}</div></div>`;
    return `<div class="paper"><div class="feed scroll">${kbSeg()}
      <div class="page-h" style="margin-bottom:14px"><div><h1 style="font-size:20px;font-weight:500;margin:0">${E.fenceTitle}</h1><p>${E.fenceInfo}</p></div></div>
      ${tip('yatakci', 'Her yatakçı farklı fiyat verir: biri güvenli ama ucuz, biri iyi öder ama riskli, biri sadece antika alır. Pazarlık teklifi yükseltebilir; tutmazsa o yatakçı bu gece o malı almaz.')}
      ${goods.length ? `<div class="goods">${goods.map(card).join('')}</div>` : `<div class="empty">${ic('package')}<p>Elinde satacak mal yok. Başarılı işlerde ganimetin bir kısmı bazen eşya olarak gelir.</p></div>`}
      </div>
      <aside class="side scroll">
        <h4>YATAKÇILAR</h4>
        ${E.fences.map(f => `<div class="fence"><div class="fh">${ic(f.icon, 'au')}<b>${f.name}</b></div><div class="mini">${ic('map-pin')}${f.place}</div><p>${f.desc}</p>
          <div class="ftags">${f.risk ? `<span class="tagx no">${ic('urgent')}%${Math.round(f.risk * 100)} takip riski</span>` : `<span class="tagx ok">${ic('shield-check')}Risksiz</span>`}${f.only ? `<span class="tagx au">Sadece antika</span>` : ''}<span class="tagx">%${Math.round(f.min * 100)}–${Math.round(f.max * 100)}</span></div></div>`).join('')}
        <h4 style="margin-top:14px">PAZARLIK</h4>
        <div class="stat"><span>Tutma şansı</span><b>%${Math.round(G.haggleChance() * 100)}</b></div>
        <p class="mini" style="white-space:normal;margin:6px 0 0">${ic('info-circle')}Pazarlık ve Tatlı dil yetenekleri şansı artırır.</p>
        <h4 style="margin-top:14px">DEPO</h4>
        <div class="stat"><span>Elindeki mallar</span><b>${goods.length} / ${GD.max || 6}</b></div>
        <p class="mini" style="white-space:normal;margin:6px 0 0">${ic('moon')}Teklifler her gece değişir.</p>
      </aside></div>`;
  }
  function scrKaraborsa() {
    if (ui.kb === 'fence') return scrFence();
    const S = G.s, M = E.market, mk = G.market(), rates = G.gemRates();
    const wares = mk.stock.map((e, i) => {
      const it = G.itemById[e.id], st = G.marketState(i);
      const price = e.gems ? `${ic('diamond', 'gem')}${e.gems}` : `${ic('coins')}${fmt(e.price)} ${E.currency}`;
      const btn = {
        sold: `<button class="buy off">${ic('check')}Satıldı</button>`,
        active: `<button class="buy off">${ic('sparkles')}Zaten hazır</button>`,
        useless: `<button class="buy off">Şu an gerek yok</button>`,
        poor: `<button class="buy off">${price}</button>`,
        ready: `<button class="buy" data-mbuy="${i}">${price}</button>`,
      }[st];
      return `<div class="item ware ${e.deal ? 'deal' : ''} ${st === 'sold' ? 'gone' : ''}">
        ${e.deal ? `<span class="dealtag">${ic('flame')}Günün fırsatı · <s>${fmt(e.full)}</s></span>` : ''}
        <div class="hd"><div class="ic">${ic(it.icon)}</div><div><div class="nm">${it.name}</div><div class="ds">${it.desc}</div></div></div>
        <div class="mini">${ic(G.immediate(it) ? 'bolt' : 'hourglass')}${G.immediate(it) ? 'Hemen etkili' : 'Sonraki işte kullanılır'}</div>${btn}</div>`;
    }).join('');
    const buffs = G.activeBuffs();
    return `<div class="paper"><div class="feed scroll">${kbSeg()}<div class="page-h" style="margin-bottom:14px"><div><h1 style="font-size:20px;font-weight:500;margin:0">${M.title}</h1><p>${M.info}</p></div></div>
      ${tip('karaborsa', 'Buradaki mallar bir sonraki işin için hazırlanır: şans, ganimet ya da güvenli kaçış verir. Mallar her gece değişir; bazen indirimli bir fırsat çıkar.')}
      <h3 class="sec">Bu geceki mallar</h3><div class="shop">${wares}</div></div>
      <aside class="side scroll">
        <p class="rumor">“${mk.rumor}”</p><div class="mini" style="margin:-4px 0 18px">— ${M.rumorBy}</div>
        <h4>SONRAKİ İŞ İÇİN HAZIR</h4>
        ${buffs.length ? buffs.map(it => `<div class="fr">${ic(it.icon, 'au')}<span style="color:var(--tx)">${it.name}</span></div>`).join('') : `<p class="mini" style="white-space:normal;margin:0">Henüz bir şey yok. Aldığın mallar bir sonraki soygunda kullanılır.</p>`}
        <h4 style="margin-top:18px">ELMAS</h4>
        <div class="stat"><span>Elindeki</span><b>${ic('diamond', 'gem')} ${S.gems}</b></div>
        <div style="margin-top:8px">${adBtn('gem', `Bedava 1 ${E.gemName}`)}</div>
        <button class="b2 ${S.gems < 1 ? 'off' : ''}" ${S.gems >= 1 ? 'data-act="sellgem"' : ''}>1 elmas boz · +${fmt(rates.sell)} ${E.currency}</button>
        <button class="b2 ${S.money < rates.buy ? 'off' : ''}" ${S.money >= rates.buy ? 'data-act="buygem"' : ''}>1 elmas al · ${fmt(rates.buy)} ${E.currency}</button>
        <p class="mini" style="white-space:normal;margin:10px 0 0">${ic('moon')}Mallar her gece yenilenir.</p>
      </aside></div>`;
  }

  function portrait(c, size) {
    return `<div class="por" style="width:${size}px;height:${size}px;background:${c.color}22;color:${c.color};border-color:${c.color}66;font-size:${Math.round(size * .5)}px">${ic(c.icon)}</div>`;
  }
  function pips(n) { return `<span class="pips">${[1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`; }
  function crewCard(c) {
    const S = G.s, st = G.crewState(c), lv = S.crew[c.id] || 0;
    const cur = c.levels[Math.max(lv, 1) - 1], next = lv && lv < 3 ? c.levels[lv] : null;
    let btn;
    if (st === 'hired') {
      const cost = G.trainCost(c);
      btn = cost ? `<button class="buy ${S.money < cost ? 'off' : ''}" data-train="${c.id}">${ic('arrow-big-up-lines')}Eğit · ${fmt(cost)} ${E.currency}</button>`
        : `<button class="buy off">${ic('crown')}En üst seviye</button>`;
      btn += `<button class="linkbtn" data-dismiss="${c.id}">Ekipten çıkar</button>`;
    } else if (st === 'locked') btn = `<button class="buy off">${ic('lock')}Seviye ${c.lv}</button>`;
    else if (st === 'full') btn = `<button class="buy off">${ic('users')}Ekipte yer yok</button>`;
    else btn = `<button class="buy ${st === 'poor' ? 'off' : ''}" ${st === 'ready' ? `data-hire="${c.id}"` : ''}>${ic('coins')}İşe al · ${fmt(c.hire)} ${E.currency}</button>`;
    return `<div class="mate ${st}">
      <div class="hd">${portrait(c, 46)}<div style="min-width:0;flex:1"><div class="row"><span class="nm">${c.name}</span>${lv ? pips(lv) : ''}</div><div class="mini" style="margin-top:2px">${c.role} · %${Math.round(c.cut * 100)} pay</div></div></div>
      <p class="quote">“${c.quote}”</p>
      <div class="eff">${ic('sparkles', 'au')}<span>${cur.desc}</span></div>
      ${next ? `<div class="eff next">${ic('arrow-up-right')}<span>Sonraki: ${next.desc}</span></div>` : ''}
      <div class="ft">${btn}</div></div>`;
  }
  function scrEkip() {
    const S = G.s, slots = E.crewSlots, hired = Object.keys(S.crew).map(id => G.crewById[id]);
    const slotRow = slots.map((need, i) => {
      const m = hired[i];
      if (m) return `<div class="slot filled">${portrait(m, 38)}<div style="min-width:0"><div class="nm">${m.name}</div><div class="mini">${m.role} ${pips(S.crew[m.id])}</div></div></div>`;
      if (S.lv >= need) return `<div class="slot open">${ic('user-plus')}<span>${E.labels.crewEmpty}</span></div>`;
      return `<div class="slot shut">${ic('lock')}<span>Seviye ${need}'de açılır</span></div>`;
    }).join('');
    const order = { hired: 0, ready: 1, poor: 2, full: 3, locked: 4 };
    const list = E.crew.slice().sort((a, b) => order[G.crewState(a)] - order[G.crewState(b)] || a.lv - b.lv);
    return `<div class="page scroll"><div class="page-h"><div><h1>Ekip</h1><p>${E.labels.crewInfo}</p></div>
      <div style="display:flex;gap:8px"><div class="sp-chip">Yer: <b>${G.crewCount()}/${G.crewSlots()}</b></div><div class="sp-chip">Ekip payı: <b>%${Math.round(G.crewCut() * 100)}</b></div></div></div>
      ${tip('ekip', 'Ekip üyeleri işini kolaylaştırır ama her başarılı işte ganimetten pay alır. Onları eğiterek güçlendirebilirsin. Seviye atladıkça ekibe daha çok kişi alabilirsin.')}
      <div class="slots">${slotRow}</div>
      <h3 class="sec">Şehirdeki adamlar</h3>
      <div class="shop">${list.map(crewCard).join('')}</div></div>`;
  }

  // Modallar
  function modal() {
    const m = ui.modal;
    if (!m) return '';
    let inner = '';
    if (m.type === 'intro') {
      inner = `<div class="big" style="background:var(--au);color:#2a1d00">${ic(E.heroIcon)}</div><h2>Hoş geldin, ${E.hero}</h2>
        <p>Küçük evlerle başla, ustalaştıkça dükkânlara, mağazalara ve müzelere uzan.</p>
        <div style="text-align:left;margin-bottom:16px">
          <div class="fr">${ic('target', 'au')}<span>Her hedefin bir başarı şansı var. Etkenleri sağ panelde görürsün.</span></div>
          <div class="fr">${ic('eye-search', 'au')}<span>Keşif yaparak şansını artırabilirsin.</span></div>
          <div class="fr">${ic('clock', 'au')}<span>Soygunlar gerçek zamanlı sürer: sessiz giriş, soygun ve kaçış.</span></div>
          <div class="fr">${ic('alert-triangle', 'wa')}<span>Soygun sırasında beklenmedik şeyler olur. Ne yapacağına sen karar verirsin.</span></div>
          <div class="fr">${ic('urgent', 'no')}<span>Başarısız olursan zabıta peşine düşebilir.</span></div>
          <div class="fr">${ic('chart-arrows', 'au')}<span>Seviye atladıkça yetenek öğren, yeni kapılar açılsın.</span></div>
        </div><button class="b1" data-act="close">Başla</button>`;
    }
    if (m.type === 'result') {
      const r = m.r;
      let icon, col, title, text;
      if (r.aborted) { icon = 'arrow-back-up'; col = 'wa'; title = 'Geri çekildin'; text = (r.log[r.log.length - 1] || {}).text || 'Bu gecelik iş yarım kaldı.'; }
      else if (r.legend) { icon = 'crown'; col = 'au'; title = 'Asrın soygunu!'; text = `${r.target.name} işi tamam. Bu geceyi İstanbul yıllarca konuşacak.`; }
      else if (r.ok) { icon = 'circle-check'; col = 'ok'; title = 'Başarılı!'; text = `${r.target.name} işi tamam. İz bırakmadan çıktın.`; }
      else if (r.caught) { icon = 'lock'; col = 'no'; title = 'Yakalandın!'; text = `Üç gece nezarethanede kaldın ve ${fmt(r.lost)} ${E.currency} kefalet ödedin. Takip biraz azaldı.`; }
      else if (r.heatUp) { icon = 'urgent'; col = 'no'; title = 'Fark edildin'; text = 'Bir bekçi düdüğü öttü, damlardan kaçtın. Zabıta artık daha dikkatli.'; }
      else { icon = 'door-exit'; col = 'wa'; title = 'Eli boş döndün'; text = 'Bir ışık yandı, sessizce geri çekildin. Kimse seni görmedi.'; }
      const chips = [];
      if (r.ok) chips.push(`<div class="rw">${ic('coins', 'au')} +${fmt(r.loot)}</div>`, `<div class="rw">${ic('star', 'au')} +${r.fame}</div>`);
      if (r.ok && r.cut) chips.push(`<div class="rw" style="color:var(--mu)">${ic('users')} Ekip payı ${fmt(r.cut)}</div>`);
      chips.push(`<div class="rw">${ic('bolt', 'xp')} +${fmt(r.xp)}</div>`);
      if (r.heatDown) chips.push(`<div class="rw">${ic('urgent', 'ok')} Takip −1</div>`);
      if (r.heatUp) chips.push(`<div class="rw">${ic('urgent', 'no')} Takip +1</div>`);
      inner = `<div class="big" style="background:var(--${col});color:#0d1630">${ic(icon)}</div><h2>${title}</h2><p>${text}</p>
        <div class="chips">${chips.join('')}</div>
        ${r.levelUps ? `<div class="lvup">${ic('arrow-big-up-lines')} Seviye ${r.lv}! +${r.levelUps} yetenek puanı, +${r.levelUps} elmas</div>` : ''}
        ${r.good ? `<div class="lvup goodline">${ic(r.good.icon)} Ganimetin bir kısmı eşya olarak geldi: ${r.good.name} (değeri ~${fmt(r.good.v)} ${E.currency}). Karaborsa'daki yatakçılara satabilirsin.</div>` : ''}
        ${r.found ? `<div class="lvup">${ic(r.found.icon)} Efsanevi bir eşya buldun: ${r.found.name}</div>` : ''}
        ${(r.sets || []).map(st => `<div class="lvup">${ic('crown')} Set tamamlandı: ${st.name}! ${st.desc}</div>`).join('')}
        ${r.secUp ? `<div class="mini" style="justify-content:center;margin:-6px 0 12px;white-space:normal">${ic('shield-lock')}${r.target.name} artık daha korunaklı: bir dahaki sefere daha zor, daha kârlı.</div>` : ''}
        ${r.safe ? `<div class="mini" style="justify-content:center;margin:-6px 0 12px">${ic('route', 'ok')}Kaçış planı sayesinde kimse seni fark etmedi.</div>` : ''}
        ${r.used && r.used.length ? `<div class="mini" style="justify-content:center;margin:-6px 0 12px;white-space:normal">${ic('building-warehouse')}Kullanıldı: ${r.used.join(', ')}</div>` : ''}
        ${(r.usedUp || []).length ? `<div class="mini" style="justify-content:center;margin:-6px 0 12px;white-space:normal">${ic('tool')}Bitti: ${r.usedUp.map(x => x.name).join(', ')}</div>` : ''}
        ${(r.broken || []).map(x => `<div class="lvup broke">${ic('hammer')} ${x.name} kırıldı! Aletler'den yenisini alabilirsin.</div>`).join('')}
        ${r.log && r.log.length ? `<div class="evlog"><div class="src">GECENİN OLAYLARI</div>${r.log.map(l => `<div class="fr">${ic(l.roll ? (l.ok ? 'circle-check' : 'alert-triangle') : 'point', l.roll ? (l.ok ? 'ok' : 'no') : 'mu')}<span><b>${l.title}:</b> ${l.choice}</span></div>`).join('')}</div>` : ''}
        ${r.levelUps ? tip('levelup', 'Seviye atladın! Yetenek puanını Yetenekler ekranında harca. Yeni seviyeler yeni hedefler de açar.')
          : r.caught ? tip('caught', 'Takip 5 iken bir kez daha fark edilince yakalanırsın. Bunu önlemek için takip yükselince dinlen ya da rüşvet ver.')
          : r.heatUp ? tip('heat', 'Zabıta takibin arttı. Takip yükseldikçe her işte şansın düşer. Gazete ekranından dinlenerek ya da rüşvetle azaltabilirsin.')
          : (r.broken || []).length ? tip('broken', 'Aletler işe yaradıkları işlerde yıpranır ve bazen kırılır. Aletler ekranından yenisini alabilirsin.')
          : r.ok ? tip('result', 'Aynı yeri tekrar soyarsan orası daha korunaklı olur: şansın düşer ama ganimet büyür. Soyulan yerler birkaç gece dinlenir.') : ''}
        ${r.news ? `<div class="clip"><div class="src">ERTESİ SABAH · ${E.labels.newspaper.toUpperCase()}</div><div class="h">${r.news.h}</div><div class="b">${r.news.b}</div></div>` : ''}
        ${adBtn('double', `Ganimeti ikiye katla · +${fmt(r.loot || 0)} ${E.currency}`, r)}
        <div class="btn-row">${r.levelUps ? `<button class="b2" data-go="yetenek">Yeteneklere git</button>` : ''}<button class="b1" data-act="close">Devam</button></div>`;
    }
    if (m.type === 'event') {
      const st = G.heistStatus();
      if (!st || !st.pending) { ui.modal = null; return ''; }
      const ev = st.pending, t = G.targetById[st.id];
      const hintCol = { 'Güvenli': 'ok', 'Orta': 'wa', 'Riskli': 'no', 'Yavaş': 'mu', 'Cesur': 'au' };
      const reqIc = c => c.req.crew ? 'users' : c.req.skill ? 'chart-arrows' : 'tool';
      inner = `<div class="big" style="background:var(--wa);color:#3a2400">${ic(ev.icon)}</div>
        <div class="mini" style="justify-content:center;margin-bottom:4px">${t.name} · ${E.heist.phases[Math.min(st.phase, 2)].name}</div>
        <h2>${ev.title}</h2><p class="evtext">${ev.text}</p>
        ${tip('event', 'Ne yapacağına sen karar verirsin. Yanında yüzde yazan seçenekler risklidir: tutarsa iyi kazandırır, tutmazsa şansını düşürür. Bazı seçenekler için ekip, yetenek ya da alet gerekir.')}
        <div class="mini" style="justify-content:center;margin-bottom:14px">${ic('target')}Şu anki başarı şansın <b style="color:var(--tx);font-weight:500">%${st.p}</b></div>
        <div class="choices">${ev.mini ? `<button class="choice minich" data-act="mini">
            <span class="ct">${ic(ev.mini.kind === 'safe' ? 'lock-square' : 'lock-open', 'au')}${ev.mini.text}</span>
            <span class="tag" style="background:var(--p2);color:var(--au)">Beceri oyunu</span></button>` : ''}${ev.choices.map((c, i) => {
          const open = G.choiceOpen(c), hc = hintCol[c.hint] || 'mu';
          return `<button class="choice ${open ? '' : 'lock'}" ${open ? `data-choice="${i}"` : ''}>
            <span class="ct">${c.req ? ic(reqIc(c), open ? 'gem' : 'dm') : ''}${c.text}</span>
            <span class="tag" style="background:var(--p2);color:var(--${hc})">${c.hint}${c.chance != null ? ` · %${G.choiceChance(c)}` : ''}</span>
            ${open ? '' : `<span class="why">${ic('lock')}${G.reqText(c)}</span>`}</button>`;
        }).join('')}</div>
        ${G.choicePenalty() ? `<div class="mini" style="justify-content:center;margin-top:10px;white-space:normal">${ic('info-circle')}Hedefin büyüklüğü${G.s.heat ? ' ve zabıta takibi' : ''} riskli seçeneklerin şansını %${G.choicePenalty()} düşürüyor.</div>` : ''}`;
    }
    if (m.type === 'outcome') {
      const o = m.o, fx = o.fx, st = G.heistStatus();
      const ch = [];
      if (fx.p) ch.push([fx.p > 0 ? 'ok' : 'no', 'target', `Şans ${fx.p > 0 ? '+' : '−'}${Math.abs(fx.p)}`]);
      if (fx.loot) ch.push([fx.loot > 0 ? 'ok' : 'no', 'coins', `Ganimet ${fx.loot > 0 ? '+' : '−'}%${Math.round(Math.abs(fx.loot) * 100)}`]);
      if (fx.time) ch.push([fx.time < 0 ? 'ok' : 'wa', 'clock', `Süre ${fx.time > 0 ? '+' : '−'}${Math.abs(fx.time)} sn`]);
      if (fx.heat) ch.push(['no', 'urgent', `Takip +${fx.heat}`]);
      if (fx.fame) ch.push(['au', 'star', `Ün +${fx.fame}`]);
      const col = o.choice.chance == null ? 'au' : o.ok ? 'ok' : 'no';
      inner = `<div class="big" style="background:var(--${col});color:#0d1630">${ic(o.choice.chance == null ? 'player-play' : o.ok ? 'circle-check' : 'alert-triangle')}</div>
        <h2>${o.choice.text}</h2>
        ${o.choice.chance != null ? `<div class="mini" style="justify-content:center;margin:-2px 0 8px;color:var(--${col})">${o.choice.mini ? (o.ok ? 'Ustalığın konuştu' : 'Elin titredi') : o.ok ? 'Şans yaver gitti' : 'Şans yüzüne gülmedi'}</div>` : ''}
        <p class="evtext">${fx.text}</p>
        ${ch.length ? `<div class="chips">${ch.map(c => `<div class="rw" style="color:var(--${c[0]})">${ic(c[1])} ${c[2]}</div>`).join('')}</div>` : ''}
        ${st ? `<div class="mini" style="justify-content:center;margin-bottom:14px">${ic('target')}Başarı şansın şimdi <b style="color:var(--tx);font-weight:500">%${st.p}</b></div>` : ''}
        <button class="b1" data-act="close">Devam</button>`;
    }
    if (m.type === 'travel') {
      const c = G.cityById[m.id], st = G.cityState(c);
      inner = `<div class="big" style="background:var(--gem);color:#0d1630">${ic('plane')}</div><h2>${c.name}</h2><p>${c.info || ''}</p>
        <div class="stat"><span>Gereken seviye</span><b>${c.lv}</b></div>
        <div class="stat" style="margin-bottom:16px"><span>${E.travelLabel || 'Yol'}</span><b>${fmt(c.cost || 0)} ${E.currency}</b></div>
        <div class="btn-row"><button class="b2" data-act="close">Vazgeç</button>${st === 'buy' ? `<button class="b1" data-act="travel">Yola çık</button>` : `<button class="b1 off">${st === 'locked' ? 'Seviye ' + c.lv : 'Yeterli para yok'}</button>`}</div>`;
    }
    if (m.type === 'quest') {
      const S = G.s, q = G.quest(), done = G.questDone(), prog = Math.min(S.quest.prog, q.n), r = q.reward;
      const skip = G.canSkipQuest();
      inner = `<div class="big" style="background:var(--au);color:#2a1d00">${ic('gift')}</div><div class="mini" style="justify-content:center;margin-bottom:4px">GÖREV</div><h2>${q.text}</h2>
        <div class="bar" style="height:8px;margin:14px 0 6px"><i style="width:${Math.round(prog / q.n * 100)}%"></i></div>
        <div class="mini" style="justify-content:center;margin-bottom:14px">${fmt(prog)} / ${fmt(q.n)}</div>
        <div class="chips">${r.money ? `<div class="rw">${ic('coins', 'au')} +${fmt(r.money)} ${E.currency}</div>` : ''}${r.gems ? `<div class="rw">${ic('diamond', 'gem')} +${r.gems} ${E.gemName}</div>` : ''}</div>
        ${done ? '' : `<p class="mini" style="justify-content:center;white-space:normal;margin:0 0 14px">${skip ? 'Bu görev sana göre değilse başka bir görev isteyebilirsin. Her gece bir kez.' : 'Bu gece görev değiştirme hakkını kullandın. Yarın yeniden isteyebilirsin.'}</p>`}
        <div class="btn-row">${done
          ? `<button class="b2" data-act="close">Kapat</button><button class="b1" data-act="claim">Ödülü al</button>`
          : `<button class="b2 ${skip ? '' : 'off'}" ${skip ? 'data-act="skipquest"' : ''}>${ic('refresh')}Başka görev</button><button class="b1" data-act="close">Tamam</button>`}</div>
        ${done ? '' : adBtn('skip', 'Bir kez daha görev değiştir')}`;
    }
    if (m.type === 'route') {
      const t = G.targetById[m.id];
      if (!t || G.s.heist) { ui.modal = null; return ''; }
      const base = G.routePreview(t, 'kapi'), last = G.s.lastRoute || 'kapi';
      const diff = (v, b, good) => v === b ? '' : (v > b) === good ? 'up' : 'down';
      inner = `<h2 style="margin-bottom:2px">Nereden gireceksin?</h2><p class="mini" style="justify-content:center;margin:0 0 12px">${t.name}</p>
        ${tip('route', 'Her yolun bir bedeli var: çatı yavaş ama güvenli, kömürlük hızlı ama riskli. Bazı yollar yetenek ister ya da sadece büyük hedeflerde açılır.')}
        <div class="routes">${G.routes.map(r => {
          const pv = G.routePreview(t, r.id), f = r.fx || {};
          const extra = [f.loot ? `<span class="rt ${f.loot > 0 ? 'up' : 'down'}">${ic('coins')}${f.loot > 0 ? '+' : ''}${Math.round(f.loot * 100)}%</span>` : '', f.heat ? `<span class="rt ${f.heat < 1 ? 'up' : 'down'}">${ic('urgent')}${f.heat < 1 ? 'Az' : 'Çok'} risk</span>` : ''].join('');
          return `<button class="route ${pv.open ? '' : 'lock'} ${r.id === last && pv.open ? 'last' : ''}" ${pv.open ? `data-route="${r.id}"` : ''}>
            <span class="ri2">${ic(pv.open ? r.icon : 'lock')}</span>
            <span class="rtx"><b>${r.name}</b><small>${pv.open ? r.desc : pv.why}</small></span>
            <span class="rstats"><span class="rt ${diff(pv.p, base.p, true)}">${ic('target')}%${pv.p}</span><span class="rt ${diff(pv.total, base.total, false)}">${ic('hourglass')}${mmss(pv.total)}</span>${extra}</span></button>`;
        }).join('')}</div>
        <button class="b2" data-act="close" style="margin-top:10px">Vazgeç</button>`;
    }
    if (m.type === 'wardrobe') {
      const tab = m.tab || 'icons', lk = G.cosLook(), list = G.cosList(tab), eq = G.cosEquipped(tab);
      inner = `<div class="wardhead"><div class="ava big" style="${lk.bg ? `background:${lk.bg};` : ''}${lk.fg ? `color:${lk.fg}` : ''}">${ic(lk.icon)}</div>
          <div><h2 style="margin:0">Görünüm</h2><p class="mini" style="margin:4px 0 0;white-space:normal">Karakterinin simgesini ve rengini seç. Elmasla alınanlar sonsuza kadar senin.</p></div>
          <div class="res" style="margin-left:auto">${ic('diamond', 'gem')}${G.s.gems}</div></div>
        <div class="seg"><button class="${tab === 'icons' ? 'on' : ''}" data-act="wtab" data-tab="icons">${ic('user')}Simge</button><button class="${tab === 'colors' ? 'on' : ''}" data-act="wtab" data-tab="colors">${ic('palette')}Renk</button></div>
        <div class="wgrid">${list.map(it => {
          const own = G.cosOwned(tab, it.id), on = it.id === eq;
          const sw = tab === 'icons' ? `<span class="wsw" style="${lk.bg ? `background:${lk.bg};` : ''}${lk.fg ? `color:${lk.fg}` : ''}">${ic(it.icon)}</span>` : `<span class="wsw" style="background:${it.bg};color:${it.fg}">${ic(lk.icon)}</span>`;
          const ach = it.ach && G.achById[it.ach];
          const state = on ? `<span class="wst on">${ic('check')}Takılı</span>` : own ? `<span class="wst">Seç</span>` : it.ach ? `<span class="wst lockd">${ic('trophy')}${ach ? ach.name : ''}</span>` : `<span class="wst ${G.s.gems >= it.gems ? 'buy' : 'poor'}">${ic('diamond')}${it.gems}</span>`;
          const can = own || (!it.ach && G.s.gems >= it.gems);
          return `<button class="witem ${on ? 'on' : ''} ${can ? '' : 'off'}" ${can ? `data-cos="${tab}:${it.id}"` : ''}>${sw}<span class="wnm">${it.name}</span>${state}</button>`;
        }).join('')}</div>
        <div class="btn-row" style="margin-top:12px">${shopOn() ? `<button class="b2" data-act="shop">${ic('diamond', 'gem')}Elmas al</button>` : ''}<button class="b1" data-act="close">Kapat</button></div>`;
    }
    if (m.type === 'night') {
      const n = G.tonight(), lines = nightLines(n);
      inner = `<div class="big" style="background:var(--p3);color:var(--au)">${ic(n.icon)}</div><div class="mini" style="justify-content:center;margin-bottom:4px">BU GECE</div><h2>${n.name}</h2><p>${n.desc}</p>
        ${lines.length ? `<div class="awl">${lines.map(l => `<div class="awr"><span class="awi" style="color:var(--${l.tone})">${ic(l.icon)}</span><span>${l.text}</span></div>`).join('')}</div>` : ''}
        <p class="mini" style="justify-content:center;margin:0 0 14px">${ic('clock')}Gece yarısı yeni bir gece başlar.</p>
        <button class="b1" data-act="close">Tamam</button>`;
    }
    if (m.type === 'mini') {
      if (!mg) { ui.modal = { type: 'event' }; return modal(); }
      const c = mg.cfg, lock = mg.kind === 'lock';
      const pins = Array.from({ length: c.steps }, (_, i) => `<span class="pin ${i < mg.step ? 'on' : ''}"></span>`).join('');
      const lives = Array.from({ length: c.misses + 1 }, (_, i) => `<span class="life ${i < mg.misses ? 'gone' : ''}">${ic('heart')}</span>`).join('');
      const board = lock
        ? `<div class="mtrack ${mg.flash}" data-act="mtap"><div class="mzone" style="left:${mg.zs * 100}%;width:${mg.zw * 100}%"></div><div class="mneedle" style="left:${mg.pos * 100}%"></div></div>`
        : `<div class="dial ${mg.flash}" data-act="mtap"><div class="dialface" style="transform:rotate(${-mg.pos}deg)">${Array.from({ length: 40 }, (_, i) => `<i style="transform:rotate(${i * 9}deg)"${i % 5 ? '' : ' class="big5"'}></i>`).join('')}</div><div class="dialmark"></div><div class="dialhub">${ic('lock-square')}</div></div>`;
      const res = mg.done ? `<div class="mres ${mg.won ? 'ok' : 'no'}">${mg.won ? (lock ? 'Açıldı!' : 'Kasa açıldı!') : 'Olmadı...'}</div>` : '';
      inner = `<h2 style="margin-bottom:4px">${lock ? 'Kilidi aç' : 'Şifreyi dinle'}</h2>
        <p class="mini" style="justify-content:center;white-space:normal;margin:0 0 10px">${lock ? 'Gösterge yeşil alana girdiğinde dokun.' : 'Çark tıkladığında (çentik parladığında) dokun.'} ${c.steps} ${lock ? 'pim' : 'rakam'}, ${c.misses} hata hakkın var.</p>
        ${tip('mini', lock ? 'Her başarılı dokunuş bir pimi yerine oturtur. Maymuncuk yeteneği ve yağlı maymuncuk yeşil alanı genişletir.' : 'Her rakamda çark yön değiştirir. Sesi açıksa tık sesini duyarsın, titreşim açıksa hissedersin. Kasa kulağı yeteneği ve stetoskop işini kolaylaştırır.')}
        <div class="mstat"><div class="pins">${pins}</div><div class="lives">${lives}</div></div>
        ${board}${res}
        ${c.helps.length ? `<div class="mini" style="justify-content:center;margin-top:8px">${ic('sparkles', 'gem')}Yardım eden: ${c.helps.join(', ')}</div>` : ''}
        <div class="btn-row" style="margin-top:12px">${!mg.step && !mg.misses && !mg.done ? '<button class="b2" data-act="minicancel">Vazgeç</button>' : ''}<button class="b1 ${mg.done ? 'off' : ''}" data-act="mtap">${lock ? 'Şimdi!' : 'Dur!'}</button></div>`;
      mg.flash = '';
    }
    if (m.type === 'ach') {
      const list = G.achState(), got = list.filter(x => x.done).length;
      const gc = window.GC && GC.available;
      inner = `<div class="achhead"><h2>${ic('trophy', 'au')}Başarımlar</h2><span class="achcount">${got} / ${list.length}</span></div>
        <div class="achlist">${list.map(({ a, done, cur, n }) => `<div class="achi ${done ? 'done' : ''}">
          <span class="achic">${ic(done ? a.icon : a.icon)}</span>
          <div class="achtx"><div class="achnm">${a.name}</div><div class="achds">${a.desc}</div>
            ${done ? '' : n > 1 ? `<div class="bar achbar"><i style="width:${Math.round(cur / n * 100)}%"></i></div><div class="achpr">${fmt(cur)} / ${fmt(n)}</div>` : ''}</div>
          <span class="achrw">${done ? ic('check', 'ok') : `${ic('diamond', 'gem')}${a.gems}`}</span></div>`).join('')}</div>
        <div class="btn-row">${gc ? `<button class="b2" data-act="gcshow">${ic('device-gamepad-2')}Game Center</button>` : ''}<button class="b1" data-act="close">Kapat</button></div>`;
    }
    if (m.type === 'away') {
      const a = m.a, mins = Math.round(a.ms / 60000), dd = Math.floor(mins / 1440), hh = Math.floor(mins % 1440 / 60), mm = mins % 60;
      const dur = dd ? `${dd} gün${hh ? ` ${hh} saat` : ''}` : hh ? `${hh} saat${mm ? ` ${mm} dakika` : ''}` : `${mm} dakika`;
      inner = `<div class="big" style="background:var(--p3);color:var(--au)">${ic('moon-stars')}</div><h2>Sen yokken</h2>
        <p>${dur} uzaktaydın. Bu arada neler oldu:</p>
        <div class="awl">${a.rows.map(r => `<div class="awr"><span class="awi" style="color:var(--${r.tone})">${ic(r.icon)}</span><span>${r.text}</span></div>`).join('')}</div>
        <button class="b1" data-act="close">Devam et</button>`;
    }
    if (m.type === 'daily') {
      const d = G.dailyState();
      const val = r => `${r.money ? `<span class="dv">${ic('coins', 'au')}${fmt(r.money)}</span>` : ''}${r.gems ? `<span class="dv">${ic('diamond', 'gem')}${r.gems}</span>` : ''}`;
      inner = `<div class="big" style="background:var(--au);color:#2a1d00">${ic('calendar-star')}</div><h2>Günlük ödül</h2>
        <p>${d.streak ? `<b style="color:var(--au)">${d.streak + 1} gündür</b> üst üste geliyorsun.` : 'Her gün uğra, ödüller büyüsün.'} Bir gün kaçırırsan seri baştan başlar.</p>
        <div class="days">${d.rewards.map((r, i) => `<div class="dday ${i < d.idx ? 'got' : i === d.idx ? 'now' : ''} ${i === d.rewards.length - 1 ? 'last' : ''}">
          <span class="dn">${i + 1}. gün</span>${i < d.idx ? `<span class="dok">${ic('check')}</span>` : val(r)}</div>`).join('')}</div>
        <button class="b1" data-act="claimdaily">${ic('gift')}Ödülü al</button>`;
    }
    if (m.type === 'shop') {
      const S = G.s, packs = Shop.packs;
      inner = `<div class="big" style="background:var(--gem);color:#0d1630">${ic('diamond')}</div><h2>${E.gemName[0].toLocaleUpperCase('tr-TR') + E.gemName.slice(1)} al</h2>
        <p>Elmasla soygunları hızlandırır, komisere rüşvet verir, karaborsadan özel mallar alırsın. Şu an <b style="color:var(--gem)">${S.gems}</b> elmasın var.</p>
        <div class="packs">${packs.map((p, i) => `<button class="pack ${p.best ? 'best' : ''}" data-gempack="${i}">
          ${p.best ? '<span class="ptag">En çok tercih edilen</span>' : ''}
          <span class="pic">${ic(p.icon, 'gem')}</span>
          <span class="pn">${p.name}</span>
          <span class="pg">${ic('diamond', 'gem')}${p.gems}${p.bonus ? `<em>+${p.bonus} hediye</em>` : ''}</span>
          <span class="pp">${p.price}</span></button>`).join('')}</div>
        ${adBtn('gem', `Reklam izle, bedava 1 ${E.gemName}`)}
        <button class="b2" data-act="close" style="margin:6px 0 0">Kapat</button>`;
    }
    if (m.type === 'menu') {
      const so = window.Sound;
      inner = `<h2>Ayarlar</h2><p>${E.title} · ${G.dateOf(G.s.day)}</p>
        ${so ? `<button class="b2 tgl ${so.sfx ? 'on' : ''}" data-act="togglesfx">${ic(so.sfx ? 'volume' : 'volume-off')}Ses efektleri<span class="sw">${so.sfx ? 'Açık' : 'Kapalı'}</span></button>
        <button class="b2 tgl ${so.music ? 'on' : ''}" data-act="togglemusic">${ic(so.music ? 'music' : 'music-off')}Müzik<span class="sw">${so.music ? 'Açık' : 'Kapalı'}</span></button>` : ''}
        ${window.Haptic && Haptic.supported ? `<button class="b2 tgl ${Haptic.on ? 'on' : ''}" data-act="togglehaptic">${ic(Haptic.on ? 'device-mobile-vibration' : 'device-mobile')}Titreşim<span class="sw">${Haptic.on ? 'Açık' : 'Kapalı'}</span></button>` : ''}
        ${window.Notify && Notify.supported ? (Notify.status === 'denied'
          ? `<button class="b2 tgl" disabled>${ic('bell-off')}Bildirimler<span class="sw">iPhone ayarlarından kapalı</span></button>`
          : `<button class="b2 tgl ${Notify.on ? 'on' : ''}" data-act="togglenotify">${ic(Notify.on ? 'bell-ringing' : 'bell-off')}Soygun bildirimleri<span class="sw">${Notify.on ? 'Açık' : 'Kapalı'}</span></button>`) : ''}
        <button class="b2" data-act="askreset">${ic('refresh')}Yeni oyun başlat</button><button class="b1" data-act="close">Kapat</button>`;
    }
    if (m.type === 'dismiss') {
      const c = G.crewById[m.id];
      inner = `<div style="margin:0 auto 12px;width:64px">${portrait(c, 64)}</div><h2>${c.name} ekipten çıksın mı?</h2><p>Geri almak istersen işe alma ücretini yeniden ödersin ve eğitimi baştan başlar.</p>
        <div class="btn-row"><button class="b2" data-act="close">Vazgeç</button><button class="b1" data-act="dismiss">Çıkar</button></div>`;
    }
    if (m.type === 'reset') {
      inner = `<div class="big" style="background:var(--no);color:#0d1630">${ic('alert-triangle')}</div><h2>Emin misin?</h2><p>Bütün ilerlemen silinecek ve oyun baştan başlayacak.</p>
        <div class="btn-row"><button class="b2" data-act="close">Vazgeç</button><button class="b1" data-act="reset">Sıfırla</button></div>`;
    }
    return `<div class="veil"><div class="modal ${['daily', 'away', 'ach', 'route', 'wardrobe'].includes(m.type) ? 'wide' : ''} ${m.type === 'ach' ? 'achm' : ''}" role="dialog" aria-modal="true">${inner}</div></div>`;
  }

  function toast(html) {
    const el = document.createElement('div');
    el.className = 'toast'; el.innerHTML = html;
    $layer.appendChild(el);
    setTimeout(() => el.remove(), 2700);
  }

  const screens = { koleksiyon: scrKoleksiyon, karaborsa: scrKaraborsa, hedef: scrHedef, yetenek: scrYetenek, alet: scrAlet, gazete: scrGazete, ekip: scrEkip };
  function render() {
    const scrolls = [...$ui.querySelectorAll('.scroll')].map(el => el.scrollTop);
    $ui.innerHTML = top() + `<div class="body">${rail()}<main class="screen">${screens[ui.screen]()}</main></div>` + modal();
    $ui.querySelectorAll('.scroll').forEach((el, i) => { if (scrolls[i]) el.scrollTop = scrolls[i]; });
  }

  // Reklamı izlet, bitirince ödülü ver.
  let adBusy = false;
  function watchAd(key) {
    if (adBusy) return;
    const res = ui.modal && ui.modal.type === 'result' ? ui.modal.r : null;
    if (!G.canAd(key, res)) return;
    adBusy = true;
    Ads.show(key).then(ok => {
      adBusy = false;
      if (!ok) { toast(`${ic('player-stop', 'mu')}Reklam yarıda kaldı, ödül verilmedi`); return; }
      const out = G.adReward(key, res);
      if (out == null) return;
      snd(key === 'gem' ? 'gem' : key === 'double' ? 'success' : 'reward');
      if (key === 'rush') toast(`${ic('bolt', 'gem')}Bir sonraki aşamaya geçildi`);
      if (key === 'double') toast(`${ic('coins', 'au')}+${fmt(out)} ${E.currency} daha`);
      if (key === 'heat') toast(`${ic('urgent', 'ok')}Takip 1 azaldı`);
      if (key === 'gem') toast(`${ic('diamond', 'gem')}+1 ${E.gemName}`);
      if (key === 'skip') { if (ui.modal && ui.modal.type === 'quest') ui.modal = null; toast(`${ic('refresh', 'au')}Yeni görev: ${out.text}`); }
      render();
    });
  }

  // Elmas paketi satın al: mağaza onaylarsa elmaslar eklenir.
  let payBusy = false;
  function buyPack(i) {
    if (payBusy || !shopOn()) return;
    const p = Shop.packs[i]; if (!p) return;
    payBusy = true;
    Shop.buy(i).then(ok => {
      payBusy = false;
      if (!ok) { toast(`${ic('x', 'mu')}Satın alma tamamlanmadı`); return; }
      G.addGems(p.gems + p.bonus); snd('gem');
      ui.modal = null;
      toast(`${ic('diamond', 'gem')}+${p.gems + p.bonus} ${E.gemName} hesabına eklendi`);
      render();
    });
  }

  $ui.addEventListener('click', e => {
    const el = e.target.closest('[data-tip],[data-gempack],[data-ad],[data-go],[data-tier],[data-sel],[data-act],[data-learn],[data-buy],[data-hire],[data-train],[data-dismiss],[data-mbuy],[data-choice],[data-mastery],[data-city],[data-route],[data-cos]');
    if (!el) return;
    const d = el.dataset;
    if (d.act === 'mtap') { const cur = mg; mgTap(); mgPaint(cur); return; } // mini oyun: pencereyi yeniden çizme, sadece değişeni güncelle
    if (window.Sound) Sound.unlock();
    if (!d.choice) snd('tap');
    if (d.tip) { G.markSeen('tip_' + d.tip); tipsShown.delete(d.tip); render(); return; }
    if (d.go || d.choice || d.act === 'close') markTips();
    if (d.ad) { watchAd(d.ad); return; }
    if (d.gempack) { buyPack(+d.gempack); return; }
    if (d.go) { ui.screen = d.go; ui.modal = null; }
    else if (d.tier) { ui.tier = d.tier; ui.sel = null; }
    else if (d.sel) { ui.sel = d.sel; }
    else if (d.learn) { if (G.learn(d.learn) && (snd('learn'), true)) toast(`${ic('circle-check', 'ok')}${G.skillById[d.learn].name} öğrenildi`); }
    else if (d.city) {
      const c = G.cityById[d.city], st = G.cityState(c);
      if (st === 'here') { /* zaten burada */ }
      else if (G.s.heist) toast(`${ic('alert-triangle', 'wa')}Önce elindeki işi bitir`);
      else if (st === 'open') { G.travel(d.city); ui.sel = null; toast(`${ic('plane', 'gem')}${c.name}'ya geçtin`.replace("'ya geçtin", ' · hoş geldin')); }
      else ui.modal = { type: 'travel', id: d.city };
    }
    else if (d.mastery) { if (G.learnMastery(d.mastery) && (snd('learn'), true)) toast(`${ic('infinity', 'au')}${G.masteryById[d.mastery].name} geliştirildi`); }
    else if (d.route) {
      const id = ui.modal && ui.modal.id, r = G.routeById[d.route];
      if (id && G.startHeist(id, d.route)) { ui.modal = null; snd('door'); toast(`${ic(r.icon, 'au')}${r.name} · ${E.heist.phases[0].name} başladı`); }
    }
    else if (d.cos) {
      const [kind, cid] = d.cos.split(':'), it = G.cosList(kind).find(x => x.id === cid);
      if (G.cosOwned(kind, cid)) { G.equipCos(kind, cid); snd('tap'); }
      else if (it && !it.ach && G.buyCos(kind, cid)) { snd('gem'); toast(`${ic('sparkles', 'au')}${it.name} senin oldu`); }
    }
    else if (d.choice) {
      const o = G.choose(+d.choice);
      if (o) {
        ui.modal = o.result ? { type: 'result', r: o.result } : { type: 'outcome', o };
        if (o.result) resultSound(o.result); else snd(o.choice.chance == null || o.ok ? 'good' : 'bad');
      }
    }
    else if (d.mbuy) { const it = G.buyMarket(+d.mbuy); if (it && (snd('coin'), true)) toast(`${ic(it.icon, 'au')}${it.name} alındı`); }
    else if (d.hire) { if (G.hire(d.hire) && (snd('coin'), true)) toast(`${ic('user-plus', 'ok')}${G.crewById[d.hire].name} ekibe katıldı`); }
    else if (d.train) { if (G.train(d.train) && (snd('learn'), true)) toast(`${ic('arrow-big-up-lines', 'au')}${G.crewById[d.train].name} artık ${G.s.crew[d.train]}. seviye`); }
    else if (d.dismiss) { ui.modal = { type: 'dismiss', id: d.dismiss }; }
    else if (d.buy) { if (G.buy(d.buy) && (snd('coin'), true)) toast(`${ic('circle-check', 'ok')}${G.toolById[d.buy].name} alındı`); }
    else {
      switch (d.act) {
        case 'rob': ui.modal = { type: 'route', id: ui.sel }; break;
        case 'wardrobe': ui.modal = { type: 'wardrobe', tab: 'icons' }; break;
        case 'wtab': if (ui.modal) ui.modal.tab = d.tab; break;
        case 'rush': if (G.rush()) snd('gem'); break;
        case 'travel': { const id = ui.modal && ui.modal.id; if (id && G.travel(id)) { ui.sel = null; toast(`${ic('plane', 'gem')}${G.cityById[id].name} · hoş geldin`); } ui.modal = null; break; }
        case 'buylegend': { const r = G.buyLegend(); if (r) { snd(r.sets.length ? 'legend' : 'reward'); toast(`${ic(r.it.icon, 'au')}${r.it.name} koleksiyonunda`); r.sets.forEach(st => toast(`${ic('crown', 'au')}Set tamamlandı: ${st.name}`)); } break; }
        case 'openevent': ui.modal = { type: 'event' }; break;
        case 'goheist': { const t = G.targetById[G.s.heist.id]; Object.assign(ui, { screen: 'hedef', tier: t.tier, sel: t.id, modal: null }); break; }
        case 'scout': if (G.scout(ui.sel) && (snd('keys'), true)) toast(`${ic('eye-search', 'au')}Keşif tamam, şansın arttı`); break;
        case 'rest': toast(G.rest() ? `${ic('zzz', 'au')}Sakin bir gece. Takip azaldı` : `${ic('zzz', 'au')}Bir gece dinlendin`); break;
        case 'bribe': if (G.bribe() && (snd('coin'), true)) toast(`${ic('diamond', 'gem')}Komiser bu sefer görmezden geldi`); break;
        case 'quest': ui.modal = { type: 'quest' }; break;
        case 'skipquest': if (G.skipQuest()) { ui.modal = null; toast(`${ic('refresh', 'au')}Yeni görev: ${G.quest().text}`); } break;
        case 'claimdaily': {
          if (ui.modal && ui.modal.type === 'daily') ui.modal = null;
          const r = G.claimDaily();
          if (r) { snd('reward'); toast(`${ic('calendar-star', 'au')}${r.day}. gün ödülü:${r.money ? ` +${fmt(r.money)} ${E.currency}` : ''}${r.money && r.gems ? ',' : ''}${r.gems ? ` +${r.gems} ${E.gemName}` : ''}`); if (window.Notify) Notify.sync(); }
          break;
        }
        case 'claim': { if (ui.modal && ui.modal.type === 'quest') ui.modal = null; const r = G.claimQuest(); if (r && (snd('reward'), true)) toast(`${ic('gift', 'au')}Görev ödülü: +${fmt(r.money)} ${E.currency}, +${r.gems} ${E.gemName}`); break; }
        case 'sellgem': if (G.sellGem() && (snd('coin'), true)) toast(`${ic('diamond', 'gem')}Bir elmas bozuldu`); break;
        case 'buygem': if (G.buyGem() && (snd('gem'), true)) toast(`${ic('diamond', 'gem')}Bir elmas alındı`); break;
        case 'menu': ui.modal = { type: 'menu' }; break;
        case 'ach': ui.modal = { type: 'ach' }; break;
        case 'night': ui.modal = { type: 'night' }; break;
        case 'mini': mgStart(); if (mg) ui.modal = { type: 'mini' }; break;
        case 'mtap': mgTap(); break;
        case 'minicancel': cancelAnimationFrame(mgRaf); mg = null; ui.modal = { type: 'event' }; break;
        case 'kbm': ui.kb = 'market'; break;
        case 'kbf': ui.kb = 'fence'; break;
        case 'haggle': {
          const f = G.fenceById[d.f], r = G.haggle(d.f, d.g);
          if (r && r.ok) { snd('coin'); toast(`${ic('arrow-up-right', 'ok')}${f.name} teklifi yükseltti: ${fmt(r.offer.price)} ${E.currency}`); }
          else if (r) { snd('bad'); toast(`${ic('mood-angry', 'no')}${f.name} alındı: "Bu malı bu gece başka kapıya götür!"`); }
          break;
        }
        case 'sell': {
          const r = G.sellGood(d.f, d.g);
          if (r) { snd('coin'); toast(`${ic('coins', 'au')}${r.good.name} satıldı: +${fmt(r.price)} ${E.currency}`);
            if (r.heatUp) setTimeout(() => { snd('whistle'); toast(`${ic('urgent', 'no')}Malın izi sürüldü: ${G.heatLabel()} +1`); }, 900); }
          break;
        }
        case 'gcshow': if (window.GC) GC.show(); break;
        case 'togglesfx': if (window.Sound) { Sound.sfx = !Sound.sfx; snd('tap'); } break;
        case 'togglemusic': if (window.Sound) Sound.music = !Sound.music; break;
        case 'togglehaptic': if (window.Haptic) Haptic.on = !Haptic.on; break;
        case 'togglenotify': if (window.Notify) { Notify.on = !Notify.on; snd('tap'); } break;
        case 'shop': ui.modal = { type: 'shop' }; break;
        case 'askreset': ui.modal = { type: 'reset' }; break;
        case 'reset': G.reset(); Object.assign(ui, { screen: 'hedef', tier: E.tiers[0].id, sel: null, modal: null }); setTimeout(() => window.Tour && Tour.maybeStart(), 300); break;
        case 'dismiss': if (ui.modal && G.dismiss(ui.modal.id)) toast(`${ic('user-minus')}${G.crewById[ui.modal.id].name} ekipten ayrıldı`); ui.modal = null; break;
        case 'close': if (ui.modal && ui.modal.type === 'intro') G.markSeen('intro'); ui.modal = null; break;
      }
    }
    render();
  });

  // Soygun sayacı: aşama değişince yeniden çiz, arada sadece süreleri güncelle.
  let lastPhase = null, lastAfford = null;
  setInterval(() => {
    G.touch();
    if (!document.getElementById('splash')) {
      const got = G.checkAch();
      if (got.length) {
        snd('levelup');
        toast(got.length === 1 ? `${ic('trophy', 'au')}Başarım: <b>${got[0].name}</b> · +${got[0].gems} ${E.gemName}`
          : `${ic('trophy', 'au')}${got.length} başarım açıldı · +${got.reduce((x, a) => x + (a.gems || 0), 0)} ${E.gemName}`);
        if (window.GC) got.forEach(a => GC.unlock(a.id));
        if (!ui.modal || ui.modal.type === 'ach') render(); else $ui.querySelectorAll('.achn').forEach(e => { e.textContent = Object.keys(G.s.ach).length; });
      }
      if (window.GC) GC.scores();
    }
    // "Sen yokken" özeti her şeyden önce gösterilir; o kapanana kadar soygun sonucu ve olay bekler.
    if (G.away) {
      if (!ui.modal && !document.getElementById('splash') && !(window.Tour && Tour.active)) { ui.modal = { type: 'away', a: G.away }; G.away = null; snd('phase'); render(); }
      return;
    }
    const st = G.heistStatus();
    // Günün ilk açılışında bu gecenin havasını duyur
    const nt = G.tonight(), nk = new Date().toDateString() + '|' + (nt && nt.id);
    if (nt && !ui.modal && G.s.nightSeen !== nk && !document.getElementById('splash') && !(window.Tour && Tour.active) && !G.dailyState().ready) {
      G.s.nightSeen = nk; toast(`${ic(nt.icon, 'au')}Bu gece: <b>${nt.name}</b>. Ayrıntı için hedeflerin üstündeki gece düğmesine dokun.`);
    }
    if (!ui.modal && !(st && (st.pending || st.done)) && !document.getElementById('splash') && !(window.Tour && Tour.active) && G.dailyState().ready) {
      ui.modal = { type: 'daily' }; snd('gem'); render();
    }
    if (window.Sound) { Sound.heist(!!st && !st.done); Sound.ambience(st && !st.pending && !st.done ? st.phase : null); }
    if (!st) { lastPhase = null; return; }
    if (st.done) {
      if (ui.modal && (ui.modal.type === 'outcome' || ui.modal.type === 'away')) return; // oyuncu önce okusun, sonra sonuç gelsin
      const r = G.finishHeist(); lastPhase = null; lastAfford = null; if (r) { ui.modal = { type: 'result', r }; resultSound(r); render(); } return;
    }
    if (st.pending) { if (!ui.modal || (ui.modal.type !== 'event' && ui.modal.type !== 'outcome' && ui.modal.type !== 'away' && ui.modal.type !== 'mini')) { ui.modal = { type: 'event' }; snd(st.pending.sfx && window.Sound && Sound.has(st.pending.sfx) ? st.pending.sfx : 'alert'); render(); } return; }
    const afford = G.s.gems >= G.rushCost();
    if (st.phase !== lastPhase || afford !== lastAfford) { if (lastPhase != null && st.phase !== lastPhase) snd('phase'); lastPhase = st.phase; lastAfford = afford; render(); return; }
    $ui.querySelectorAll('[data-htotal]').forEach(e => { e.textContent = mmss(st.totalLeft); });
    $ui.querySelectorAll('[data-hleft]').forEach(e => { e.textContent = mmss(st.phaseLeft); });
    $ui.querySelectorAll('[data-hbar]').forEach(e => { e.style.width = Math.round(st.phaseProg * 100) + '%'; });
    $ui.querySelectorAll('[data-hrush]').forEach(e => { e.textContent = G.rushCost(); });
  }, 500);

  // Uygulama arka plandan dönünce de "sen yokken" kontrolü (soğuk açılışta motor zaten yaptı)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { G.touch(Date.now(), true); return; }
    const a = G.awayCheck();
    if (a && !G.away) G.away = a;
  });

  // Başlangıç turu için küçük arayüz bağlantısı
  window.UI = {
    home() { Object.assign(ui, { screen: 'hedef', tier: E.tiers[0].id, sel: null, modal: null }); render(); },
    get busy() { return !!ui.modal; },
    refresh() { render(); },
  };

  document.title = E.title;
  render();
})();
