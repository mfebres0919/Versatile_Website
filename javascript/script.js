/* ==========================================================================
   HOMEPAGE — looping background videos (hero + Say Their Names memorial)
   The videos have no autoplay attribute: this starts them, so they never
   run for visitors who asked for reduced motion or less data (Save-Data).
   They keep the poster photo instead. Once frames are actually playing, a
   video fades in over its poster (.is-playing). Encoded H.264 High@4.0 so
   older phones can decode them too. Each pauses while off
   screen, and its round button lets anyone pause it for good.
   ========================================================================== */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection?.saveData === true;

function setupLoopVideo(video, toggle) {
  if (!video || reduceMotion || saveData) return;

  let pausedByVisitor = false;
  const label = toggle.dataset.videoLabel || 'background video';

  video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });

  // Phones can refuse to autoplay (e.g. iPhone Low Power Mode). Then the
  // poster stays, and the first tap anywhere on the page, which phones do
  // count as permission, tries again.
  const play = () => video.play().catch(() => {
    document.addEventListener('touchend', () => {
      if (!pausedByVisitor) video.play().catch(() => {});
    }, { once: true, passive: true });
  });

  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    pausedByVisitor = !video.paused;
    if (pausedByVisitor) video.pause();
    else play();
    toggle.classList.toggle('is-paused', pausedByVisitor);
    toggle.setAttribute('aria-label', `${pausedByVisitor ? 'Play' : 'Pause'} ${label}`);
  });

  // Only spend battery and bandwidth on it while it's on screen
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !pausedByVisitor) play();
    else video.pause();
  }).observe(video);
}

setupLoopVideo(document.querySelector('[data-hero-video]'), document.querySelector('[data-hero-video-toggle]'));
setupLoopVideo(document.querySelector('[data-memorial-video]'), document.querySelector('[data-memorial-video-toggle]'));

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


/* ==========================================================================
   HOMEPAGE — about stats count up (300+, 3, 10+)
   The final values are in the HTML; this resets them to 0 and counts up
   once, the first time the row is mostly on screen. Reduced motion: the
   numbers simply stay as written.
   ========================================================================== */

const countGroup = document.querySelector('[data-count-group]');

if (countGroup && !reduceMotion) {
  const counters = countGroup.querySelectorAll('[data-count-to]');
  const COUNT_DURATION = 1600; // ms

  const showCount = (counter, value) => {
    counter.textContent = value + (counter.dataset.countSuffix || '');
  };

  counters.forEach((counter) => showCount(counter, 0));

  new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / COUNT_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      counters.forEach((counter) => showCount(counter, Math.round(Number(counter.dataset.countTo) * eased)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { threshold: 0.6 }).observe(countGroup);
}


/* ==========================================================================
   HOMEPAGE — values carousel
   The row is a native scroller with snap points (styles.css), so swipes
   follow the finger and settle on a card. Arrows step one card; after the
   last card they wrap round. Every 5s it advances by itself, pausing on
   hover, keyboard focus and touch, and while the tab is hidden. No
   auto-advance for reduced motion (the arrows and swiping still work).
   ========================================================================== */

const values = document.querySelector('[data-values]');

if (values) {
  const valuesTrack = values.querySelector('.values__track');
  const valueCards = valuesTrack.querySelectorAll('.value-card');
  const VALUES_DURATION = 5000;
  let valuesTimer = null;

  // Card nearest the left edge of the row
  function currentValue() {
    const start = valueCards[0].offsetLeft;
    let nearest = 0;
    valueCards.forEach((card, i) => {
      if (Math.abs(card.offsetLeft - start - valuesTrack.scrollLeft) <
          Math.abs(valueCards[nearest].offsetLeft - start - valuesTrack.scrollLeft)) nearest = i;
    });
    return nearest;
  }

  function goToValue(next) {
    const atEnd = valuesTrack.scrollLeft + valuesTrack.clientWidth >= valuesTrack.scrollWidth - 4;
    if (next >= valueCards.length || (next > currentValue() && atEnd)) next = 0;
    if (next < 0) next = valueCards.length - 1;
    valuesTrack.scrollTo({ left: valueCards[next].offsetLeft - valueCards[0].offsetLeft });
  }

  function stopValues() {
    clearInterval(valuesTimer);
    valuesTimer = null;
  }

  function startValues() {
    if (reduceMotion) return;
    stopValues();
    valuesTimer = setInterval(() => goToValue(currentValue() + 1), VALUES_DURATION);
  }

  const valuesBox = values.closest('.about__values');
  valuesBox.querySelector('[data-values-prev]').addEventListener('click', () => { goToValue(currentValue() - 1); startValues(); });
  valuesBox.querySelector('[data-values-next]').addEventListener('click', () => { goToValue(currentValue() + 1); startValues(); });

  valuesBox.addEventListener('mouseenter', stopValues);
  valuesBox.addEventListener('mouseleave', startValues);
  valuesBox.addEventListener('focusin', stopValues);
  valuesBox.addEventListener('focusout', (event) => {
    if (!valuesBox.contains(event.relatedTarget)) startValues();
  });
  valuesTrack.addEventListener('touchstart', stopValues, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopValues();
    else startValues();
  });

  startValues();
}
