// The motion layer for the gallery direction.
//
// Everything that can be done in CSS is done in CSS — entrances, hover
// choreography and the parallax drift all live in d-gallery.css. What is left
// here needs a value the stylesheet cannot know: the pointer position, the
// scroll state, and which rug the visitor is about to open.

const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/* ── chrome reacts to scroll ────────────────────────────────────────────── */
export function watchScroll() {
  let ticking = false;
  const apply = () => {
    document.body.classList.toggle('scrolled', scrollY > 24);
    ticking = false;
  };
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  }, { passive: true });
  apply();
}

/* ── the loupe follows the pointer inside a frame ───────────────────────── */
export function loupe(root) {
  if (reduced.matches) return;
  let frame = 0, next = null;
  root.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const shot = e.target.closest('.shot');
    if (!shot) return;
    const disc = shot.querySelector('.loupe');
    if (!disc) return;
    next = [disc, shot.getBoundingClientRect(), e.clientX, e.clientY];
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const [el, r, x, y] = next;
      el.style.setProperty('--lx', (x - r.left) + 'px');
      el.style.setProperty('--ly', (y - r.top) + 'px');
    });
  }, { passive: true });
}

/* ── a button that leans toward the cursor ──────────────────────────────── */
export function magnetic(el, strength = 0.28, radius = 90) {
  if (!el || reduced.matches) return;
  const reset = () => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); };
  addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) > radius + Math.max(r.width, r.height) / 2) return reset();
    el.style.setProperty('--mx', (dx * strength).toFixed(1) + 'px');
    el.style.setProperty('--my', (dy * strength).toFixed(1) + 'px');
  }, { passive: true });
  el.addEventListener('pointerleave', reset);
}

/* ── shared-element navigation ──────────────────────────────────────────────
   Only the rug being opened is given a transition name, and only at the moment
   of the click. Naming all eighteen up front would make the browser snapshot
   every one of them on every navigation. */
export function sharedElement(root) {
  root.addEventListener('click', e => {
    const link = e.target.closest('a[href^="product.html"]');
    if (!link) return;
    const card = link.closest('.card');
    const img = card && card.querySelector('.shot img');
    if (img) img.style.viewTransitionName = 'carpet';
  });
}

/* ── palette picker ─────────────────────────────────────────────────────────
   Only possible because every colour in the direction is a variable. Swapping
   one attribute on <html> repaints the whole page, which is the same mechanism
   a dark mode would use later. */
const PALETTES = [
  ['chalk-char',   'گچ و زغال',        ['#FAFAFA', '#18181B', '#A16207']],
  ['cream-gold',   'کرم و طلا',        ['#FAFAF9', '#1C1917', '#A16207']],
  ['shell-copper', 'صدفی و مسی',       ['#F7F3EC', '#2A2320', '#A65A2E']],
  ['bone-lapis',   'استخوانی و لاجوردی', ['#F8F6F1', '#1B1A17', '#2B4C7E']],
  ['grey-toranj',  'خاکستری و ترنجی',  ['#F6F6F7', '#17171A', '#B0442C']],
];

export function palettePicker() {
  const saved = document.documentElement.dataset.palette
    || localStorage.getItem('toranjan-palette') || PALETTES[0][0];
  const apply = id => {
    document.documentElement.dataset.palette = id;
    localStorage.setItem('toranjan-palette', id);
    bar.querySelectorAll('button').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.p === id)));
  };

  const bar = document.createElement('aside');
  bar.className = 'palette-bar';
  bar.setAttribute('aria-label', 'انتخاب پالت');
  bar.innerHTML = '<b>پالت</b>' + PALETTES.map(([id, label, dots]) => `
    <button type="button" data-p="${id}" aria-pressed="false">
      <span class="dots">${dots.map(c => `<i style="background:${c}"></i>`).join('')}</span>
      <span>${label}</span>
    </button>`).join('');

  bar.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) apply(b.dataset.p);
  });
  document.body.append(bar);
  apply(saved);
}

/* ── the result count counts ────────────────────────────────────────────── */
export function countUp(el, to, digits) {
  if (!el || reduced.matches) return;
  const dur = 700, t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = digits(Math.round(to * eased));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
