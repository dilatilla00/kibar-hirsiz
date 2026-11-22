// Elmas satın alma (uygulama içi satın alma). Oyun mağazayı bilmez; sadece Shop.enabled(), Shop.packs ve Shop.buy() kullanır.
//
// Modlar (reklamlarla aynı mantık):
//   'off'  : satın alma yeri hiç görünmez
//   'test' : sahte bir ödeme penceresi açılır, gerçek para alınmaz
//   'on'   : gerçek satın alma. iOS uygulamasında yerel tarafa (StoreKit) "store" mesajıyla sorulur.
//
// Mod seçimi: aşağıdaki MODE, ya da adres çubuğunda ?shop=test / ?shop=off (bu cihazda hatırlanır).
window.Shop = (function () {
  const MODE = 'off';

  // Paketler. product: App Store Connect'te açılacak ürün kimliği. price: test modunda görünen fiyat;
  // gerçek modda fiyat App Store'dan (ülkeye göre) gelir.
  const packs = [
    { product: 'com.kibarhirsiz.oyun.gems10', name: 'Bir avuç elmas', gems: 10, bonus: 0, price: '₺49,99', icon: 'diamond' },
    { product: 'com.kibarhirsiz.oyun.gems30', name: 'Elmas kesesi', gems: 30, bonus: 3, price: '₺129,99', icon: 'diamonds' },
    { product: 'com.kibarhirsiz.oyun.gems80', name: 'Elmas sandığı', gems: 80, bonus: 15, price: '₺299,99', icon: 'box', best: true },
    { product: 'com.kibarhirsiz.oyun.gems200', name: 'Saray hazinesi', gems: 200, bonus: 50, price: '₺649,99', icon: 'crown' },
  ];

  let mode = MODE;
  try {
    const q = new URLSearchParams(location.search).get('shop');
    if (q) localStorage.setItem('gk_shop', q);
    mode = localStorage.getItem('gk_shop') || MODE;
  } catch (e) { /* depolama yoksa varsayılan */ }

  const bridge = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.store;
  const enabled = () => mode === 'test' || (mode === 'on' && !!bridge);

  // Yerel taraf satın alma bitince window.Shop._done(id, true/false) çağırır.
  // Gerçek fiyatlar gelince window.Shop._prices({ productId: '₺49,99', ... }) çağrılabilir.
  const pending = {};
  let seq = 0;
  function _done(id, ok) { const f = pending[id]; if (f) { delete pending[id]; f(!!ok); } }
  function _prices(map) { packs.forEach(p => { if (map && map[p.product]) p.price = map[p.product]; }); }

  function testPay(p) {
    return new Promise(resolve => {
      const host = document.querySelector('.game') || document.body;
      const el = document.createElement('div');
      el.className = 'adtest';
      el.innerHTML = `<div class="adbox"><div class="adtag">TEST SATIN ALMA</div><div class="adttl">${p.name}</div>
        <div class="adsub">${p.gems + p.bonus} elmas · ${p.price}</div><p class="adsub" style="margin:12px 0">Gerçek para alınmaz. Gerçek uygulamada burada Apple'ın ödeme penceresi açılır.</p>
        <button class="b2 adclose">Satın al (test)</button><button class="linkbtn adskip">Vazgeç</button></div>`;
      host.appendChild(el);
      const finish = ok => { el.remove(); resolve(ok); };
      el.querySelector('.adclose').addEventListener('click', e => { e.stopPropagation(); finish(true); });
      el.querySelector('.adskip').addEventListener('click', e => { e.stopPropagation(); finish(false); });
    });
  }

  function buy(i) {
    const p = packs[i];
    if (!p || !enabled()) return Promise.resolve(false);
    if (mode === 'test') return testPay(p);
    return new Promise(resolve => {
      const id = ++seq; pending[id] = resolve;
      try { bridge.postMessage({ id, product: p.product }); } catch (e) { _done(id, false); }
    });
  }

  return { packs, enabled, buy, _done, _prices, get mode() { return mode; } };
})();
