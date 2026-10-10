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
