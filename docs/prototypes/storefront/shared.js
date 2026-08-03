// Shared data + rendering for the storefront design directions.
// Every direction renders the SAME markup from the SAME real catalogue rows, so
// what differs between the pages is design, not content.

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export const faNum = n => String(n).replace(/\d/g, d => FA_DIGITS[+d]).replace('.', '٫');
export const faPrice = p => faNum(Number(p).toLocaleString('en-US').replace(/,/g, '٫'));
const meters = cm => faNum(String(cm / 100).replace(/\.0$/, ''));

export const MATERIAL = {
  WOOL: 'پشم', SILK: 'ابریشم', COTTON: 'پنبه', ACRYLIC: 'اکریلیک',
  POLYESTER: 'پلی‌استر', VISCOSE: 'ویسکوز', MIXED: 'مخلوط',
};
export const PATTERN = {
  LACHAK_TORANJ: 'لچک‌ترنج', AFSHAN: 'افشان', MEDALLION: 'ترنجی', GEOMETRIC: 'هندسی',
  TRIBAL: 'عشایری', FLORAL: 'گل‌دار', MODERN: 'مدرن', VINTAGE: 'وینتیج', PLAIN: 'ساده',
};

const NAV = ['فرش‌ها', 'جست‌وجوی بصری', 'مشاور چیدمان', 'راهنمای اندازه', 'درباره‌ی ما'];
const FILTERS = ['اندازه', 'رنگ', 'طرح', 'جنس', 'بازه‌ی قیمت', 'نوع اتاق'];
const DIRECTIONS = [
  ['gallery', 'گالری موزه‌ای'],
  ['editorial', 'ادیتوریال'],
  ['cinematic', 'سینمایی تاریک'],
  ['material', 'گرم و خاکی'],
  ['glass', 'شیشه‌ای'],
];

// Split for the entrance animations. Each word keeps its own mask so it can
// climb out independently; the markup stays one readable string per word, which
// matters because a screen reader should not hear this letter by letter.
export const words = (text, delay = 0) => text.split(' ').map((w, i) =>
  `<span class="w"><span style="animation-delay:${(delay + i * .09).toFixed(2)}s">${w}</span></span>`
).join(' ');

// Letters are only ever used on the latin wordmark, which is decorative and
// already duplicated by the Persian name beside it.
export const letters = (text, delay = 0) => text.split('').map((ch, i) =>
  `<span style="animation-delay:${(delay + i * .04).toFixed(2)}s">${ch}</span>`
).join('');

const icon = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  search: icon('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  heart:  icon('<path d="M12 20.5 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 0 1 19.4 13Z"/>'),
  bag:    icon('<path d="M5 8h14l-1 12H6Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  cube:   icon('<path d="M12 3 4 7.5v9L12 21l8-4.5v-9Z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>'),
  chevron:icon('<path d="m6 9 6 6 6-6"/>'),
};

// The prototypes are served from the repository root, so the storage folder the
// backend writes into can be read straight off disk without running the API.
export const toSrc = url => '../../../backend/data/storage' + url.replace('/files', '');

export const loadCarpets = () => fetch('carpets.json', { cache: 'no-store' }).then(r => r.json());
export { meters };

function cardHTML(c, i) {
  const sizes = c.sizes || [];
  const s = sizes[Math.min(1, sizes.length - 1)];
  const cheapest = sizes.reduce((a, b) => (a.p <= b.p ? a : b), sizes[0]);
  const href = `product.html?c=${encodeURIComponent(c.slug)}`;
  return `
<article class="card reveal" style="--i:${i}">
  <a class="shot" href="${href}" aria-label="${c.name}">
    <img src="${toSrc(c.img)}" alt="${c.name}" loading="lazy" decoding="async">
    <span class="shot-veil" aria-hidden="true"></span>
    <span class="loupe" aria-hidden="true">مشاهده</span>
    <button class="ar" type="button">${ICONS.cube}<span>در خانه‌ی من ببین</span></button>
  </a>
  <div class="info">
    <p class="eyebrow">${c.origin || '—'} · ${PATTERN[c.pattern] || ''}</p>
    <h2 class="title"><a href="${href}">${faNum(c.name)}</a></h2>
    <p class="meta">
      <span class="mat">${MATERIAL[c.material] || ''}</span>
      <span class="sep" aria-hidden="true"></span>
      <span class="size">${meters(s.w)} × ${meters(s.l)} متر</span>
      <span class="more">${faNum(sizes.length)} اندازه</span>
    </p>
    <p class="price"><span class="num">${faPrice(cheapest.p)}</span><span class="cur">تومان</span>
      <span class="from">از</span></p>
    <div class="swatches" aria-hidden="true">
      ${(c.colors || []).slice(0, 4).map(h => `<i style="background:${h}"></i>`).join('')}
    </div>
  </div>
</article>`;
}

export async function build(root, dirId) {
  const carpets = await loadCarpets();

  root.innerHTML = `
<header class="site">
  <a class="brand" href="index.html">
    <span class="fa">ترنجان</span>
    <span class="lat">${letters('TORANJAN', .5)}</span>
  </a>
  <nav class="nav">${NAV.map((n, i) =>
    `<a href="#"${i === 0 ? ' class="on"' : ''} style="animation-delay:${(.3 + i * .05).toFixed(2)}s">${n}</a>`).join('')}</nav>
  <div class="tools">
    <button aria-label="جست‌وجو" style="animation-delay:.55s">${ICONS.search}</button>
    <button aria-label="علاقه‌مندی‌ها" style="animation-delay:.6s">${ICONS.heart}</button>
    <button aria-label="سبد خرید" style="animation-delay:.65s">${ICONS.bag}<em>۲</em></button>
  </div>
</header>

<section class="pagehead">
  <p class="kicker">Collection · مجموعه</p>
  <h1>${words('همه‌ی فرش‌ها', .45)}</h1>
  <p class="lede">هر فرش را پیش از خرید، با ابعاد واقعی روی کف خانه‌ی خودت ببین.</p>
</section>

<div class="filters">
  <div class="chips">${FILTERS.map((f, i) =>
    `<button class="chip" style="animation-delay:${(.85 + i * .04).toFixed(2)}s">${f}${ICONS.chevron}</button>`).join('')}</div>
  <div class="sortbar">
    <span class="count">${faNum(carpets.length)} فرش</span>
    <button class="chip sort">مرتب‌سازی: تازه‌ترین${ICONS.chevron}</button>
  </div>
</div>

<main class="grid">${carpets.map(cardHTML).join('')}</main>

<div class="more-row"><button class="loadmore">فرش‌های بیشتر</button></div>

<footer class="site-foot">
  <p class="fa">ترنجان</p>
  <p class="lat">TORANJAN — HAND-KNOTTED, AT TRUE SCALE</p>
  <p class="fig">EST. 2026 · 300 × 400 CM</p>
</footer>

<aside class="switcher" aria-label="تعویض جهت طراحی">
  <span>جهت طراحی:</span>
  ${DIRECTIONS.map(([id, label]) =>
    `<a href="${id}.html"${id === dirId ? ' class="on"' : ''}>${label}</a>`).join('')}
</aside>`;

  reveal(root);
  return carpets;
}

// Staggered entrance. Elements start hidden only when motion is welcome, so a
// reduced-motion visitor never waits on an observer to show them the catalogue.
function reveal(root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = root.querySelectorAll('.reveal');
  if (reduced) { items.forEach(el => el.classList.add('in')); return; }

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      obs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach(el => io.observe(el));
}
