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
  document.documentElement.classList.toggle('menu-open', open);
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

/* Tapping the dimmed strip beside the drawer (header::before) closes it */
header.addEventListener('click', (event) => {
  if (event.target === header) setMenu(false);
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

/* Back to top: shows after one screen of scrolling. scrollTo inherits the
   smooth scroll from CSS, which is already off for reduced motion. */
const toTop = document.querySelector('[data-to-top]');

if (toTop) {
  const updateToTop = () => {
    toTop.classList.toggle('is-visible', window.scrollY > window.innerHeight);
  };

  updateToTop();
  window.addEventListener('scroll', updateToTop, { passive: true });

  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0 });
    // Hand focus back to the top so keyboard users continue from there
    document.querySelector('.header__logo')?.focus({ preventScroll: true });
  });
}

/* Newsletter signup (footer). Not connected to a mailing list yet, same
   as the live site: it checks the address and thanks the visitor. To
   connect it, post the email to the provider (Mailchimp, Squarespace
   Email Campaigns, etc.) where marked below. */
const newsletter = document.querySelector('[data-newsletter]');

if (newsletter) {
  const email = newsletter.querySelector('input[type="email"]');
  const status = document.querySelector('[data-newsletter-status]');

  newsletter.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!email.checkValidity()) {
      email.setAttribute('aria-invalid', 'true');
      status.textContent = 'Please enter a valid email address.';
      email.focus();
      return;
    }

    // Send email.value to the mailing list provider here
    email.removeAttribute('aria-invalid');
    newsletter.reset();
    status.textContent = 'Thank you! You’re part of the VI family.';
  });
}
