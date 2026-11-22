// Yükleme ve açılış ekranı. Metinleri ERA'dan, kayıt bilgisini Game'den okur.
(function () {
  const G = window.Game, E = G.E;
  const $s = document.getElementById('splash');
  if (!$s) return;
  const q = sel => $s.querySelector(sel);
  const L = s => (window.I18N ? I18N.L(s) : s);

  q('.sp-title').textContent = E.title;
  const tipInit = q('.sp-tip'); if (tipInit) tipInit.textContent = L(tipInit.textContent);
  q('.sp-play').textContent = L(q('.sp-play').textContent);

  // iOS uygulamasına "ekran çizildi" haberi ver (yerel amblem bu sinyalle kalkar)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    try { window.webkit.messageHandlers.ready.postMessage(1); } catch (e) { /* tarayıcıda yok */ }
  }));
  q('.sp-tag').textContent = E.tagline || '';

  // İpuçları sırayla döner
  const tips = E.loadingTips || [];
  let ti = Math.floor(Math.random() * Math.max(tips.length, 1));
  const tipEl = q('.sp-tip');
  function nextTip() {
    if (!tips.length) return;
    tipEl.classList.remove('in');
    void tipEl.offsetWidth; // animasyonu yeniden başlat
    tipEl.textContent = tips[ti++ % tips.length];
    tipEl.classList.add('in');
  }
  nextTip();
  const tipTimer = setInterval(nextTip, 2200);

  // Yazı tipleri ve görseller hazır olunca (en az MIN ms) çubuk dolar
  const MIN = 2200, t0 = performance.now();
  let ready = false;
  const imgs = [...document.images].map(im => im.complete ? Promise.resolve() : new Promise(r => { im.onload = im.onerror = r; }));
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([Promise.all([fonts, ...imgs]), new Promise(r => setTimeout(r, 4000))]).then(() => { ready = true; });

  const bar = q('.sp-bar i');
  (function step() {
    let p = Math.min((performance.now() - t0) / MIN, 1);
    p = 1 - Math.pow(1 - p, 2); // yavaşlayarak dolsun
    if (!ready) p = Math.min(p, 0.92);
    bar.style.width = (p * 100).toFixed(1) + '%';
    if (p < 1) requestAnimationFrame(step); else setTimeout(showMenu, 250);
  })();

  function showMenu() {
    clearInterval(tipTimer);
    const S = G.s, played = S.stats.robs > 0;
    q('.sp-play').textContent = L(played ? 'Devam et' : 'Oyuna başla');
    q('.sp-save').textContent = L(played
      ? `Seviye ${S.lv} · ${Math.round(S.money).toLocaleString((window.I18N ? I18N.locale : 'tr-TR'))} ${E.currency}`
      : 'Yeni bir hikâye seni bekliyor');
    $s.classList.add('ready');
  }

  q('.sp-play').addEventListener('click', e => {
    e.stopPropagation();
    if (window.Sound) { Sound.unlock(); Sound.play('unlock'); }
    $s.classList.add('out');
    setTimeout(() => { $s.remove(); document.dispatchEvent(new Event('gk:start')); }, 600);
  });
})();
