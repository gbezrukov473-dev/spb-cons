/* ====================================================
   МОДАЛЬНЫЕ ОКНА — логика
   ==================================================== */
(function () {
  'use strict';

  var overlay = document.getElementById('modalOverlay');
  var activeModal = null;

  /* ---------- Открытие / закрытие ---------- */
  function openModal(modalId) {
    closeModal(); // закрыть предыдущее, если есть
    var modal = document.getElementById(modalId);
    if (!modal) return;

    // Для модалки 3 — сброс на шаг A
    if (modalId === 'modalLk') {
      switchStep(modal, 'a');
    }

    overlay.classList.add('is-active');
    modal.classList.add('is-active');
    document.body.classList.add('modal-open');
    activeModal = modal;
  }

  function closeModal() {
    if (!activeModal) return;
    overlay.classList.remove('is-active');
    activeModal.classList.remove('is-active');
    document.body.classList.remove('modal-open');
    activeModal = null;
  }

  // Глобальные функции для удобства
  window.openModal = openModal;
  window.closeModal = closeModal;

  /* ---------- Клик на оверлей ---------- */
  overlay.addEventListener('click', closeModal);

  /* ---------- Крестики ---------- */
  document.querySelectorAll('.modal__close').forEach(function (btn) {
    btn.addEventListener('click', closeModal);
  });

  /* ---------- Escape ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  /* ---------- Предотвращаем закрытие при клике внутри модалки ---------- */
  document.querySelectorAll('.modal').forEach(function (modal) {
    modal.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  });

  /* ---------- Модалка 3: Переключение шагов ---------- */
  function switchStep(modal, targetStep) {
    var steps = modal.querySelectorAll('.modal__step');
    steps.forEach(function (step) {
      step.classList.remove('modal__step--active');
      step.classList.remove('modal__step--entering');
    });

    var target = modal.querySelector('[data-step="' + targetStep + '"]');
    if (!target) return;

    // Плавное появление
    target.classList.add('modal__step--entering');
    // Форсируем reflow
    void target.offsetHeight;
    target.classList.add('modal__step--active');
    target.classList.remove('modal__step--entering');
  }

  // Кнопки «Да» и «Еще нет»
  var lkModal = document.getElementById('modalLk');
  if (lkModal) {
    lkModal.querySelectorAll('[data-goto]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var step = btn.getAttribute('data-goto');
        switchStep(lkModal, step);
      });
    });
  }

  /* ---------- Привязка триггеров ---------- */

  // Кнопка «Узнать цену» в шапке
  document.querySelectorAll('.header-top__cta-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openModal('modalPrice');
    });
  });

  // Кнопка «Попробовать бесплатно» в hero
  document.querySelectorAll('.btn--outline-gray').forEach(function (btn) {
    if (btn.textContent.trim() === 'Попробовать бесплатно') {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openModal('modalTrial');
      });
    }
  });

  // Кнопка «Личный кабинет» в навигации
  document.querySelectorAll('.header-nav__link--lk, .mobile-menu__link--lk').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openModal('modalLk');
    });
  });

  // Все кнопки «Узнать цену» на странице (смарт-комплекты и др.)
  document.querySelectorAll('a.btn').forEach(function (btn) {
    var text = btn.textContent.trim();
    if (text === 'Узнать цену' && !btn.classList.contains('header-top__cta-btn')) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openModal('modalPrice');
      });
    }
  });

})();