/* ==========================================================================
   HOMEPAGE — looping background videos (hero + Say Their Names memorial)
   Phones only reliably autoplay a video that is muted, inline and marked
   autoplay. The hero has those attributes in the HTML; the memorial gets
   autoplay here just before it scrolls into view, so it doesn't download
   on page load. For reduced motion or Save-Data the video is removed and
   only the poster shows. Once frames are actually playing, a video fades
   in over its poster (.is-playing). Each pauses while off screen; its
   round button pauses it for good and always shows the real state.
   Encoded H.264 High@4.0 so older phones can decode them too.
   ========================================================================== */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection?.saveData === true;

function setupLoopVideo(video, toggle) {
  if (!video) return;

  if (reduceMotion || saveData) {
    video.remove();
    return;
  }

  let pausedByVisitor = false;
  const label = toggle.dataset.videoLabel || 'background video';

  // Some browsers check the property, not just the attribute
  video.muted = true;

  video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });

  // The button mirrors what the video is really doing
  const syncToggle = () => {
    toggle.classList.toggle('is-paused', video.paused);
    toggle.setAttribute('aria-label', `${video.paused ? 'Play' : 'Pause'} ${label}`);
  };
  video.addEventListener('play', syncToggle);
  video.addEventListener('pause', syncToggle);

  // If a phone still refuses (e.g. iPhone Low Power Mode), the poster stays
  // and the first tap anywhere on the page, which counts as permission,
  // tries again.
  const play = () => video.play().catch(() => {
    document.addEventListener('touchend', () => {
      if (!pausedByVisitor) video.play().catch(() => {});
    }, { once: true, passive: true });
  });

  toggle.hidden = false;
  syncToggle();
  toggle.addEventListener('click', () => {
    pausedByVisitor = !video.paused;
    if (pausedByVisitor) video.pause();
    else play();
  });

  // Start (and start loading) just before it's on screen; pause when it leaves
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !pausedByVisitor) {
      video.autoplay = true;
      play();
    } else {
      video.pause();
    }
  }, { rootMargin: '200px 0px' }).observe(video);
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


/* ==========================================================================
   HOMEPAGE — programs: light up the track in the middle of the screen
   Whichever track crosses the middle band of the screen gets .is-active
   (its number fills orange, its copy brightens). On desktop the pinned
   frame shows that track's photo and the counter follows. The first track
   is active from the start so the frame is never empty.
   ========================================================================== */

const programItems = document.querySelectorAll('[data-program]');

if (programItems.length) {
  const programSlides = document.querySelectorAll('[data-program-slide]');
  const programCurrent = document.querySelector('[data-program-current]');

  function setProgram(index) {
    programItems.forEach((item, i) => item.classList.toggle('is-active', i === index));
    programSlides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
    if (programCurrent) programCurrent.textContent = String(index + 1).padStart(2, '0');
  }

  setProgram(0);

  // A thin band across the middle of the screen: a track is "current"
  // while any part of it sits in that band
  const programObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setProgram([...programItems].indexOf(entry.target));
    });
  }, { rootMargin: '-45% 0px -45% 0px' });

  programItems.forEach((item) => programObserver.observe(item));
}


/* ==========================================================================
   HOMEPAGE — CTA circle
   --circle runs 0 → 1 while the section's top travels from the foot of the
   screen to a fifth of the way down: the white layer starts out covering
   everything and shrinks into a circle (styles.css). Reduced motion: left
   at the CSS default of 1, so the circle is simply already formed.
   ========================================================================== */

const cta = document.querySelector('[data-cta]');

if (cta && !reduceMotion) {
  let ctaTicking = false;

  function updateCta() {
    const top = cta.getBoundingClientRect().top;
    const travel = window.innerHeight * 0.8;
    const p = Math.min(Math.max((window.innerHeight - top) / travel, 0), 1);
    const eased = 1 - Math.pow(1 - p, 2);
    cta.style.setProperty('--circle', eased.toFixed(3));
    ctaTicking = false;
  }

  const requestCtaUpdate = () => {
    if (ctaTicking) return;
    ctaTicking = true;
    requestAnimationFrame(updateCta);
  };

  updateCta();
  window.addEventListener('scroll', requestCtaUpdate, { passive: true });
  window.addEventListener('resize', requestCtaUpdate);
}
