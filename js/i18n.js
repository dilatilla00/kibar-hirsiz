// Dil desteği: Türkçe (asıl) ve İngilizce.
// - Dil: önce oyuncunun seçimi (gk_lang), yoksa telefonun dili (Türkçe değilse İngilizce).
// - İçerik (hedefler, olaylar, haberler...): ERA içindeki Türkçe metinler ERA_EN'den (content.en.js) değiştirilir.
//   Bu, motor (engine.js) yüklenmeden önce yapılır; motor her şeyi zaten İngilizce görür.
// - Arayüz: ekrana basılan HTML, UI_EN sözlüğüyle (js/i18n.en.js) parça parça çevrilir: I18N.L(html).
// Türkçe seçiliyken hiçbir şey değişmez.
window.I18N = (function () {
  let lang = null;
  try { lang = localStorage.getItem('gk_lang'); } catch (e) { /* yoksay */ }
  if (lang !== 'tr' && lang !== 'en') lang = /^tr\b/i.test(navigator.language || 'tr') ? 'tr' : 'en';
  const en = lang === 'en';
  document.documentElement.lang = lang;

  // FNV-1a özeti (content.en.js anahtarlarıyla aynı)
  const h = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(36); };

  // İçerik çevirisi: kimlik/simge gibi alanlara dokunma
  const SKIP = new Set(['id', 'icon', 'tag', 'tier', 'scene', 'sfx', 'kind', 'cat', 'city', 'set', 'target', 'branch', 'req', 'tool', 'skill', 'crew', 'color', 'bg', 'fg', 'ach', 'product', 'tiers', 'only']);
  function translateContent(o, key) {
    if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) { if (typeof o[i] === 'string') { if (!SKIP.has(key)) o[i] = tr(o[i]); } else translateContent(o[i], key); } return; }
    if (!o || typeof o !== 'object') return;
    for (const k in o) {
      const v = o[k];
      if (typeof v === 'string') { if (!SKIP.has(k)) o[k] = tr(v); } else translateContent(v, k);
    }
  }
  const tr = s => (en && window.ERA_EN && typeof s === 'string' && ERA_EN[h(s)]) || s;
  if (en && window.ERA) {
    translateContent(window.ERA, '');
    // Tek kelimelik küçük harfli adlar özetle çevrilmez, elle:
    ERA.gemName = 'diamonds';
  }

  // Arayüz çevirisi (sadece etiketlerin dışındaki metinlere dokunur):
  //  exact: metin parçasının tamamı buysa (kısa kelimeler için, başka kelimelerin içinde eşleşmesin diye)
  //  rules: sözcük sırası değişen kalıplar (düzenli ifade)
  //  frag : metnin içinde geçen parçalar (uzun olan önce)
  let rx = null, map = null, exact = null, rules = [];
  function build() {
    const d = window.UI_EN || {};
    map = new Map(Object.entries(d.frag || {}));
    exact = new Map(Object.entries(d.exact || {}));
    rules = (d.rules || []).map(([p, r]) => [new RegExp(p, 'g'), r]);
    const keys = [...map.keys()].sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    rx = keys.length ? new RegExp(keys.join('|'), 'g') : null;
  }
  function text(t) {
    const k = t.trim();
    if (!k) return t;
    if (exact.has(k)) return t.replace(k, exact.get(k));
    for (const [r, v] of rules) t = t.replace(r, v);
    if (rx) t = t.replace(rx, m => map.get(m));
    return t.replace(/%(\d+)/g, '$1%').replace(/\b1 diamonds\b/g, '1 diamond');
  }
  function L(s) {
    if (!en || s == null) return s;
    if (!map) build();
    const parts = String(s).split(/(<[^>]*>)/);
    for (let i = 0; i < parts.length; i += 2) parts[i] = text(parts[i]);
    return parts.join('');
  }

  return {
    lang, en,
    locale: en ? 'en-US' : 'tr-TR',
    L, tr,
    set(l) { try { localStorage.setItem('gk_lang', l); } catch (e) { /* yoksay */ } location.reload(); },
  };
})();
