/* ==========================================================================
   HOMEPAGE — hero background video
   The video has no autoplay attribute: this starts it, so it never runs for
   visitors who asked for reduced motion or less data (Save-Data). They keep
   the poster photo instead. Once frames are actually playing the video
   fades in over the poster (.is-playing). It pauses while the hero is off
   screen, and the round button lets anyone pause it for good.
   ========================================================================== */

const heroVideo = document.querySelector('[data-hero-video]');
const heroVideoToggle = document.querySelector('[data-hero-video-toggle]');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection?.saveData === true;

if (heroVideo && !reduceMotion && !saveData) {
  let pausedByVisitor = false;

  heroVideo.addEventListener('playing', () => heroVideo.classList.add('is-playing'), { once: true });

  // Browsers can refuse to play (e.g. low-power mode); the poster just stays
  const playHero = () => heroVideo.play().catch(() => {});

  function setToggle(paused) {
    heroVideoToggle.classList.toggle('is-paused', paused);
    heroVideoToggle.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
  }

  heroVideoToggle.hidden = false;
  heroVideoToggle.addEventListener('click', () => {
    pausedByVisitor = !heroVideo.paused;
    if (pausedByVisitor) heroVideo.pause();
    else playHero();
    setToggle(pausedByVisitor);
  });

  // Only spend battery and bandwidth on it while it's on screen
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !pausedByVisitor) playHero();
    else heroVideo.pause();
  }).observe(heroVideo);
}


/* ==========================================================================
   HOMEPAGE — about intro ("Hey neighbor. Allow us to re-introduce ourselves.")
   Turns the intro into a tall scroll track with a pinned stage (styles.css
   .is-pinned). "Hey neighbor." fades up as the section scrolls onto the
   screen. Progress p then runs 0 → 1 from when the stage pins to when it
   lets go; each phrase reads its own slice of that as --enter and --exit,
   and the orange fill on "ourselves." reads --fill. Updates are batched to
   one per frame. Reduced motion: never pinned, the phrases stay stacked.
   ========================================================================== */

const intro = document.querySelector('[data-intro]');

if (intro && !reduceMotion) {
  const phrases = intro.querySelectorAll('[data-intro-phrase]');
  const accent = intro.querySelector('.about__accent');

  // Slices of p for each phrase: [enter start, enter end, exit start, exit end].
  // Phrase 1 enters on arrival instead (see updateIntro); phrase 3 never leaves.
  const PHRASE_TIMELINE = [
    [null, null, 0.1, 0.32],
    [0.22, 0.4, 0.5, 0.7],
    [0.6, 0.78, null, null],
  ];
  const FILL_TIMELINE = [0.78, 0.95];

  const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const slice = (p, start, end) => easeOut(clamp01((p - start) / (end - start)));

  let introTicking = false;

  function updateIntro() {
    const rect = intro.getBoundingClientRect();
    const track = rect.height - window.innerHeight;
    const p = clamp01(-rect.top / track);
    // 0 while the section's top is at the foot of the screen, 1 once it pins
    const arrival = clamp01(1 - rect.top / window.innerHeight);

    phrases.forEach((phrase, i) => {
      const [enterStart, enterEnd, exitStart, exitEnd] = PHRASE_TIMELINE[i];
      const enter = enterStart === null ? slice(arrival, 0.25, 0.9) : slice(p, enterStart, enterEnd);
      const exit = exitStart === null ? 0 : slice(p, exitStart, exitEnd);
      phrase.style.setProperty('--enter', enter.toFixed(3));
      phrase.style.setProperty('--exit', exit.toFixed(3));
    });

    accent.style.setProperty('--fill', slice(p, ...FILL_TIMELINE).toFixed(3));
    introTicking = false;
  }

  function requestIntroUpdate() {
    if (introTicking) return;
    introTicking = true;
    requestAnimationFrame(updateIntro);
  }

  intro.classList.add('is-pinned');
  updateIntro();
  window.addEventListener('scroll', requestIntroUpdate, { passive: true });
  window.addEventListener('resize', requestIntroUpdate);
}
