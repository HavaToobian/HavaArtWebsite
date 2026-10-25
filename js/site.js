const navigation = document.querySelector('.site-nav');
const menuButton = document.querySelector('[data-menu-toggle]');
const main = document.querySelector('main');
const mobile = window.matchMedia('(max-width: 760px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function closeMenu(restoreFocus = false) {
  navigation.classList.remove('is-open');
  document.body.classList.remove('menu-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open menu');
  main.inert = false;
  if (restoreFocus) menuButton.focus();
}

function syncMenu() {
  closeMenu();
  menuButton.hidden = !mobile.matches;
}
syncMenu();
mobile.addEventListener('change', syncMenu);
menuButton.addEventListener('click', () => {
  if (navigation.classList.contains('is-open')) {
    closeMenu(true);
  } else {
    navigation.classList.add('is-open');
    document.body.classList.add('menu-open');
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', 'Close menu');
    main.inert = true;
    navigation.querySelector('a').focus();
  }
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', event => {
  if (!navigation.classList.contains('is-open')) return;
  if (event.key === 'Escape') {
    closeMenu(true);
  } else if (event.key === 'Tab') {
    const controls = [...navigation.querySelectorAll('a'), menuButton];
    const index = controls.indexOf(document.activeElement);
    event.preventDefault();
    controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length].focus();
  }
});

document.querySelectorAll('[data-slideshow]').forEach(carousel => {
  const slides = [...carousel.querySelectorAll('[data-slide]')];
  const previous = carousel.querySelector('[data-previous]');
  const next = carousel.querySelector('[data-next]');
  const pause = carousel.querySelector('[data-pause]');
  const counter = carousel.querySelector('[data-counter]');
  const status = carousel.querySelector('[data-slide-status]');
  const stage = carousel.querySelector('[data-stage]');
  let current = 0;
  let timer;
  let playing = carousel.dataset.autoplay === 'true' && !reducedMotion.matches;
  let gesture;
  let suppressClick = false;

  function loadSlide(index) {
    const image = slides[index].querySelector('img');
    if (!image.getAttribute('src')) {
      image.loading = 'eager';
      image.srcset = image.dataset.srcset;
      image.src = image.dataset.src;
    }
  }

  function updatePause() {
    if (!pause) return;
    pause.setAttribute('aria-label', playing ? 'Pause slideshow' : 'Play slideshow');
    pause.setAttribute('aria-pressed', String(!playing));
    pause.querySelector('[data-pause-icon]').textContent = playing ? 'Ⅱ' : '▷';
  }

  function schedule() {
    window.clearTimeout(timer);
    if (!playing || document.hidden) return;
    timer = window.setTimeout(() => {
      if (!navigation.classList.contains('is-open')) show(current + 1);
      else schedule();
    }, 5000);
  }

  function show(index, announce = false) {
    current = (index + slides.length) % slides.length;
    loadSlide(current);
    slides.forEach((slide, i) => { slide.hidden = i !== current; });
    counter.textContent = `${current + 1} / ${slides.length}`;
    counter.setAttribute('aria-label', `Artwork ${current + 1} of ${slides.length}`);
    if (announce) status.textContent = `${slides[current].querySelector('img').alt}. Artwork ${current + 1} of ${slides.length}.`;
    schedule();
    // Preload one artwork ahead; the rest wait until needed.
    const image = slides[current].querySelector('img');
    image.decode().catch(() => {}).then(() => loadSlide((current + 1) % slides.length));
  }

  previous.addEventListener('click', () => show(current - 1, true));
  next.addEventListener('click', () => show(current + 1, true));
  pause?.addEventListener('click', () => {
    playing = !playing;
    updatePause();
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      playing = false;
      updatePause();
      schedule();
    }
  });
  document.addEventListener('keydown', event => {
    if (navigation.classList.contains('is-open') || event.altKey || event.ctrlKey || event.metaKey) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowRight' ? 1 : -1), true);
    }
  });
  stage.addEventListener('pointerdown', event => {
    suppressClick = false;
    if (event.pointerType !== 'mouse') gesture = { x: event.clientX, y: event.clientY };
  });
  stage.addEventListener('pointercancel', () => { gesture = null; });
  stage.addEventListener('pointerup', event => {
    if (!gesture) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      suppressClick = true;
      show(current + (dx < 0 ? 1 : -1), true);
    }
  });
  // A swipe changes slides without also opening the full-image link.
  stage.addEventListener('click', event => {
    if (suppressClick) {
      event.preventDefault();
      suppressClick = false;
    }
  });
  updatePause();
  show(0);
});
