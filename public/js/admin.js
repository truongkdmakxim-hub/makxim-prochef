(() => {
  'use strict';
  // Confirm destructive actions: <form data-confirm="...">
  document.addEventListener('submit', (e) => {
    const msg = e.target.dataset.confirm;
    if (msg && !window.confirm(msg)) e.preventDefault();
  });
  // Auto-submit filter selects
  document.querySelectorAll('[data-autosubmit]').forEach((f) => f.addEventListener('change', () => f.submit()));
  // Live slug preview from product name (only while slug untouched)
  const name = document.querySelector('#name');
  const slug = document.querySelector('#slug');
  if (name && slug && !slug.value) {
    let touched = false;
    slug.addEventListener('input', () => { touched = true; });
    name.addEventListener('input', () => {
      if (touched) return;
      slug.value = name.value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    });
  }
})();
