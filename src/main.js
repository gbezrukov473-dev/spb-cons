// ===== Dropdown «Новости» =====
const dropdownItem = document.querySelector('.header-nav__item--dropdown');
const dropdownBtn = dropdownItem?.querySelector('.header-nav__link--dropdown');

if (dropdownBtn) {
  dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdownItem.classList.toggle('is-open');
    dropdownBtn.setAttribute('aria-expanded', isOpen);
  });
}

// Закрытие dropdown по клику вне
document.addEventListener('click', (e) => {
  if (dropdownItem && !dropdownItem.contains(e.target)) {
    dropdownItem.classList.remove('is-open');
    dropdownBtn?.setAttribute('aria-expanded', 'false');
  }
});

// Закрытие по Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    dropdownItem?.classList.remove('is-open');
    dropdownBtn?.setAttribute('aria-expanded', 'false');
    closeMobileMenu();
  }
});

// ===== Бургер-меню =====
const burger = document.querySelector('.header-burger');
const mobileMenu = document.querySelector('.mobile-menu');

function closeMobileMenu() {
  burger?.classList.remove('is-active');
  burger?.setAttribute('aria-expanded', 'false');
  mobileMenu?.classList.remove('is-open');
  document.body.style.overflow = '';
}

function openMobileMenu() {
  burger?.classList.add('is-active');
  burger?.setAttribute('aria-expanded', 'true');
  mobileMenu?.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

burger?.addEventListener('click', () => {
  const isOpen = mobileMenu?.classList.contains('is-open');
  isOpen ? closeMobileMenu() : openMobileMenu();
});

// Клик по оверлею закрывает мобильное меню
mobileMenu?.addEventListener('click', (e) => {
  if (e.target === mobileMenu) {
    closeMobileMenu();
  }
});

// Закрытие мобильного меню при клике на ссылку
mobileMenu?.querySelectorAll('.mobile-menu__link').forEach((link) => {
  link.addEventListener('click', closeMobileMenu);
});
/* ====================================================
   КАРУСЕЛЬ ОТЗЫВОВ — бесконечная
   ==================================================== */
(function () {
  'use strict';

  var TOTAL = 5;

  var viewport = document.querySelector('.reviews__viewport');
  var track    = document.querySelector('.reviews__track');
  var btnPrev  = document.querySelector('.reviews__btn--prev');
  var btnNext  = document.querySelector('.reviews__btn--next');

  if (!viewport || !track) return;

  /* ---------- Clone slides for infinite effect ---------- */
  var origSlides = Array.from(track.children);

  // We clone the entire set twice: prepend + append
  // So layout is: [clone 0-4] [orig 0-4] [clone 0-4] = 15 slides
  origSlides.forEach(function (s) {
    var clone = s.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });
  for (var i = origSlides.length - 1; i >= 0; i--) {
    var clone = origSlides[i].cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.insertBefore(clone, track.firstChild);
  }

  var allSlides = Array.from(track.children);
  // Start at center of the original set (index 2 in originals = index 7 in allSlides)
  var currentIndex = TOTAL + Math.floor(TOTAL / 2);
  var isAnimating = false;

  /* ---------- Responsive helpers ---------- */
  function getVisibleCount() {
    var w = window.innerWidth;
    if (w <= 600) return 1;
    if (w <= 960) return 3;
    return 5;
  }

  function getGap() {
    return parseInt(getComputedStyle(track).gap) || 16;
  }

  function getSlideWidth() {
    var vw = viewport.offsetWidth;
    var visible = getVisibleCount();
    var gap = getGap();
    return (vw - (visible - 1) * gap) / visible;
  }

  function applyWidths() {
    var sw = getSlideWidth();
    allSlides.forEach(function (s) {
      s.style.width = sw + 'px';
    });
  }

  /* ---------- Positioning ---------- */
  function getOffset(index) {
    var sw = getSlideWidth();
    var gap = getGap();
    var vw = viewport.offsetWidth;
    return index * (sw + gap) - (vw - sw) / 2;
  }

  function updateCenterClass() {
    allSlides.forEach(function (s, i) {
      s.classList.toggle('is-center', i === currentIndex);
    });
  }

  function positionTrack(animate) {
    var offset = getOffset(currentIndex);

    if (!animate) {
      // Disable ALL transitions — track + individual slides
      track.classList.add('no-transition');
      allSlides.forEach(function (s) { s.style.transition = 'none'; });
    }

    track.style.transform = 'translateX(' + (-offset) + 'px)';
    updateCenterClass();

    if (!animate) {
      // Force reflow so browser applies no-transition state
      void track.offsetHeight;
      // Re-enable transitions
      track.classList.remove('no-transition');
      allSlides.forEach(function (s) { s.style.transition = ''; });
    }
  }

  /* ---------- Navigation ---------- */
  function goTo(index, animate) {
    currentIndex = index;
    positionTrack(animate);
  }

  function next() {
    if (isAnimating) return;
    isAnimating = true;
    goTo(currentIndex + 1, true);
  }

  function prev() {
    if (isAnimating) return;
    isAnimating = true;
    goTo(currentIndex - 1, true);
  }

  /* ---------- Infinite loop jump ---------- */
  function checkBounds() {
    isAnimating = false;
    // If on a clone region, jump instantly to the mirrored real slide
    if (currentIndex >= TOTAL + TOTAL) {
      goTo(currentIndex - TOTAL, false);
    } else if (currentIndex < TOTAL) {
      goTo(currentIndex + TOTAL, false);
    }
  }

  track.addEventListener('transitionend', function (e) {
    if (e.target === track) {
      checkBounds();
    }
  });

  btnPrev.addEventListener('click', prev);
  btnNext.addEventListener('click', next);

  /* ---------- Keyboard ---------- */
  document.addEventListener('keydown', function (e) {
    var rect = viewport.getBoundingClientRect();
    var inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (!inView) return;
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });

  /* ---------- Touch / Swipe ---------- */
  var touchStartX = 0;
  var touchStartY = 0;
  var touchDeltaX = 0;
  var isSwiping = false;
  var swipeThreshold = 40;

  viewport.addEventListener('touchstart', function (e) {
    if (isAnimating) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchDeltaX = 0;
    isSwiping = false;
    track.classList.add('no-transition');
    allSlides.forEach(function (s) { s.style.transition = 'none'; });
  }, { passive: true });

  viewport.addEventListener('touchmove', function (e) {
    if (isAnimating) return;
    var dx = e.touches[0].clientX - touchStartX;
    var dy = e.touches[0].clientY - touchStartY;

    if (!isSwiping && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      isSwiping = Math.abs(dx) > Math.abs(dy);
      if (!isSwiping) return;
    }
    if (!isSwiping) return;
    e.preventDefault();

    touchDeltaX = dx;
    var baseOffset = getOffset(currentIndex);
    track.style.transform = 'translateX(' + (-baseOffset + touchDeltaX) + 'px)';
  }, { passive: false });

  viewport.addEventListener('touchend', function () {
    track.classList.remove('no-transition');
    allSlides.forEach(function (s) { s.style.transition = ''; });

    if (!isSwiping && touchDeltaX === 0) return;

    if (Math.abs(touchDeltaX) > swipeThreshold) {
      if (touchDeltaX < 0) next();
      else prev();
    } else {
      positionTrack(true);
    }

    touchDeltaX = 0;
    isSwiping = false;
  }, { passive: true });

  /* ---------- Resize ---------- */
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      applyWidths();
      positionTrack(false);
    }, 100);
  });

  /* ---------- Init ---------- */
  applyWidths();
  positionTrack(false);
})();