// Başlangıç turu: yeni oyunculara ekranın ilgili yerlerini sırayla aydınlatıp anlatır. Bir kez gösterilir.
window.Tour = (function () {
  const G = window.Game, E = G.E;
  const ic = n => `<i class="ti ti-${n}" aria-hidden="true"></i>`;

  // Adımlar: sel = aydınlatılacak yer (#ui içinde), yoksa ortada gösterilir.
  const STEPS = [
    { icon: E.heroIcon, title: `Hoş geldin, ${E.hero}`, text: `${E.tagline || ''}. Küçük evlerle başlayıp şehrin en büyük hazinelerine uzanacaksın. Sana kısaca etrafı göstereyim.` },
    { sel: '.grid .card', title: 'Hedefler', text: 'Her kart soyabileceğin bir yer. Sağ üstte başarı şansın, altta ganimet aralığı yazar. Kilitli kartlar seviye ve yetenekle açılır.' },
    { sel: '.detail .dinfo', title: 'Şansın neye bağlı?', text: 'Seçtiğin hedefin ayrıntıları burada. Şansı artıran ve düşüren her etkeni tek tek görürsün: köpek, kilit, bekçi, yeteneklerin, aletlerin...' },
    { sel: '[data-act="scout"]', title: 'Önce keşif', text: 'Biraz para verip keşif yaparsan bir sonraki işte şansın artar. Zor hedeflerde işe yarar.' },
    { sel: '[data-act="rob"]', title: 'Soyguna başla', text: 'Önce giriş yolunu seçersin: çatı, arka kapı, kömürlük... Sonra soygun gerçek zamanlı sürer: sessiz giriş, soygun ve kaçış. Bu sırada oyundan çıkabilirsin, iş devam eder.' },
    { sel: '.top', title: 'Üst çubuk', text: 'Paran, elmasın, ünün ve zabıta takibin. Elmasla soygunları hızlandırabilirsin. Takip arttıkça şansın düşer; 5\'e ulaşıp bir kez daha fark edilirsen yakalanırsın.' },
    { sel: '.quest', title: 'Görevler', text: 'Görevleri tamamladıkça para ve elmas kazanırsın. Göreve dokunup ayrıntısını görebilir, beğenmezsen başkasıyla değiştirebilirsin.' },
    { sel: '.rail', title: 'Menü', text: 'Yetenek öğren, alet al, karaborsadan mal topla, ekibini kur. Her ekrana ilk girdiğinde orada ne yapacağını kısaca anlatacağım.' },
    { icon: 'flag', title: 'Hazırsın', text: 'İlk hedefini seç ve soyguna başla. Soygun sırasında beklenmedik şeyler olacak; ne yapacağına sen karar vereceksin. Bol şans!' },
  ];

  let $c = null, step = 0, timer = 0;

  const seen = () => (G.s.seen || {}).tour || (G.s.seen || {}).intro;
  function maybeStart() {
    if (seen() || G.s.stats.robs > 0 || $c) return;
    start();
  }

  function start() {
    if (window.UI) UI.home();
    const host = document.querySelector('.game');
    $c = document.createElement('div');
    $c.className = 'coach';
    $c.innerHTML = '<div class="hole"></div><div class="bub" role="dialog" aria-live="polite"></div>';
    $c.addEventListener('click', e => {
      const b = e.target.closest('[data-tour]');
      e.stopPropagation();
      if (!b) return;
      if (window.Sound) Sound.play('tap');
      if (b.dataset.tour === 'next') go(step + 1);
      else if (b.dataset.tour === 'back') go(step - 1);
      else finish();
    });
    host.appendChild($c);
    go(0);
    loop();
  }

  function go(i) {
    if (i >= STEPS.length) return finish();
    step = Math.max(0, i);
    const s = STEPS[step], last = step === STEPS.length - 1;
    $c.querySelector('.bub').innerHTML = (window.I18N ? I18N.L : s => s)(`
      ${s.icon ? `<div class="bic">${ic(s.icon)}</div>` : ''}
      <div class="bt">${s.title}</div><div class="bx">${s.text}</div>
      <div class="bf"><span class="bn">${step + 1} / ${STEPS.length}</span>
        ${last ? '' : '<button class="linkbtn" data-tour="skip">Turu atla</button>'}
        ${step > 0 && !last ? '<button class="b2 bb" data-tour="back">Geri</button>' : ''}
        <button class="b1 bnext" data-tour="next">${last ? 'Başla' : step === 0 ? 'Göster' : 'İleri'}</button></div>`);
    place();
  }

  // Aydınlatılan yeri ve balonu hedef öğenin üstüne yerleştir. Telefon dik tutulup oyun döndürüldüyse ortada göster.
  function place() {
    if (!$c) return;
    const host = $c.parentElement, s = STEPS[step];
    const hole = $c.querySelector('.hole'), bub = $c.querySelector('.bub');
    const el = s.sel && !host.classList.contains('rot') ? document.querySelector('#ui ' + s.sel) : null;
    const W = $c.clientWidth, H = $c.clientHeight;
    if (!el) {
      hole.style.cssText = `left:${W / 2}px;top:${H / 2}px;width:0;height:0;`;
      bub.style.left = Math.max(12, (W - bub.offsetWidth) / 2) + 'px';
      bub.style.top = Math.max(12, (H - bub.offsetHeight) / 2) + 'px';
      bub.classList.add('mid');
      return;
    }
    bub.classList.remove('mid');
    const gr = host.getBoundingClientRect(), k = gr.width / host.offsetWidth || 1, r = el.getBoundingClientRect();
    const pad = 6;
    const x = (r.left - gr.left) / k - host.clientLeft - pad, y = (r.top - gr.top) / k - host.clientTop - pad;
    const w = r.width / k + pad * 2, h = Math.min(r.height / k + pad * 2, H - 8);
    hole.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;
    const bw = bub.offsetWidth, bh = bub.offsetHeight, gap = 12;
    let bx = x + w / 2 - bw / 2, by = y + h + gap;
    if (by + bh > H - 8) by = y - bh - gap;               // altta yer yoksa üstte
    if (by < 8) {                                         // üstte de yoksa yanda
      by = Math.max(8, Math.min(H - bh - 8, y + h / 2 - bh / 2));
      bx = x + w + gap + bw < W ? x + w + gap : x - bw - gap;
    }
    bub.style.left = Math.max(8, Math.min(W - bw - 8, bx)) + 'px';
    bub.style.top = Math.max(8, Math.min(H - bh - 8, by)) + 'px';
  }
  // Ekran yeniden çizilince ya da boyut değişince konumu tazele (saniyede birkaç kez yeterli, pil dostu)
  function loop() { clearInterval(timer); timer = setInterval(() => { if ($c) place(); else clearInterval(timer); }, 250); addEventListener('resize', place); }

  function finish() {
    clearInterval(timer); removeEventListener('resize', place);
    if ($c) { $c.classList.add('out'); const c = $c; setTimeout(() => c.remove(), 300); }
    $c = null;
    G.markSeen('tour');
  }

  // Açılış ekranından "Oyuna başla" denince ya da açılış ekranı yoksa sayfa açılınca
  document.addEventListener('gk:start', () => setTimeout(maybeStart, 450));
  if (!document.getElementById('splash')) setTimeout(maybeStart, 300);

  return { maybeStart, start, get active() { return !!$c; } };
})();
