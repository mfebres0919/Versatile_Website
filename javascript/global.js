/* ==========================================================================
   GLOBAL — header scroll state + mobile navigation (every page)
   ========================================================================== */

const header = document.getElementById('header');
const navToggle = document.getElementById('nav-toggle');
const nav = document.getElementById('nav');

/* Header: transparent at the top, white once the user scrolls */
function updateHeader() {
  header.classList.toggle('is-scrolled', window.scrollY > 10);
}

updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

/* Mobile menu */
function setMenu(open) {
  header.classList.toggle('is-open', open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

navToggle.addEventListener('click', () => {
  setMenu(!header.classList.contains('is-open'));
});

/* Close after choosing a link (covers same-page anchors like #programs) */
nav.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMenu(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && header.classList.contains('is-open')) {
    setMenu(false);
    navToggle.focus();
  }
});

/* Reset if the window grows past the mobile breakpoint while open */
window.matchMedia('(min-width: 1024px)').addEventListener('change', (event) => {
  if (event.matches) setMenu(false);
});

/* Scroll reveal: .reveal blocks fade up the first time they scroll into
   view (styles in global.css). Skipped entirely for reduced motion, so
   those visitors never see hidden content. */
const revealBlocks = document.querySelectorAll('.reveal');

if (revealBlocks.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('has-reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });

  revealBlocks.forEach((block) => revealObserver.observe(block));
}
