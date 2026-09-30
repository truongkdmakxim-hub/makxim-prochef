(() => {
  'use strict';

  document.documentElement.classList.remove('no-js');
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const csrf = $('meta[name="csrf-token"]')?.content || '';
  const money = (n) => `${new Intl.NumberFormat('vi-VN').format(n)}₫`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Toasts ---------- */
  const toastRoot = $('[data-toasts]');
  function toast(message, type = 'success') {
    if (!toastRoot || !message) return;
    const el = document.createElement('div');
    el.className = `toast ${type === 'error' ? 'error' : ''}`;
    el.textContent = message;
    toastRoot.appendChild(el);
    setTimeout(() => {
      el.classList.add('leaving');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, 3200);
  }

  /* ---------- Overlays (menu + drawer) with focus trap ---------- */
  let lastFocus = null;
  function openOverlay(el) {
    lastFocus = document.activeElement;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const focusable = $('button, a[href], input', $('.panel', el));
    setTimeout(() => focusable?.focus(), 50);
  }
  function closeOverlay(el) {
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lastFocus?.focus?.();
  }
  function trapFocus(el, e) {
    if (e.key !== 'Tab' || !el.classList.contains('is-open')) return;
    const items = $$('a[href], button:not([disabled]), input, select, textarea', $('.panel', el)).filter((n) => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  const mobileNav = $('[data-mobile-nav]');
  const menuBtn = $('[data-menu-open]');
  if (mobileNav && menuBtn) {
    menuBtn.addEventListener('click', () => { openOverlay(mobileNav); menuBtn.setAttribute('aria-expanded', 'true'); });
    $$('[data-menu-close]', mobileNav).forEach((b) => b.addEventListener('click', () => { closeOverlay(mobileNav); menuBtn.setAttribute('aria-expanded', 'false'); }));
    mobileNav.addEventListener('keydown', (e) => trapFocus(mobileNav, e));
  }

  const drawer = $('[data-drawer]');
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (drawer?.classList.contains('is-open')) closeOverlay(drawer);
    if (mobileNav?.classList.contains('is-open')) { closeOverlay(mobileNav); menuBtn?.setAttribute('aria-expanded', 'false'); }
  });

  /* ---------- Header scroll state ---------- */
  const header = $('[data-header]');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Cart API ---------- */
  async function post(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'X-CSRF-Token': csrf, 'X-Requested-With': 'XMLHttpRequest' },
      body: new URLSearchParams(data),
      credentials: 'same-origin',
    });
    const json = await res.json().catch(() => ({ ok: false, message: 'Có lỗi xảy ra, vui lòng thử lại.' }));
    return { ok: res.ok && json.ok !== false, ...json };
  }

  function updateCount(count) {
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = count;
      el.dataset.count = count;
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    });
    $$('[data-cart-open]').forEach((el) => el.setAttribute('aria-label', `Giỏ hàng (${count} sản phẩm)`));
  }

  function renderDrawer(cart) {
    if (!drawer) return;
    const body = $('[data-drawer-body]', drawer);
    const foot = $('[data-drawer-foot]', drawer);
    if (!cart.items.length) {
      body.innerHTML = `<div class="empty-state"><span class="ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span><p>Giỏ hàng đang trống.</p><a class="btn btn-primary" href="/san-pham">Mua sắm ngay</a></div>`;
      foot.hidden = true;
      return;
    }
    body.innerHTML = cart.items
      .map(
        (i) => `<div class="mini-item">
          <img src="${esc(i.image)}" alt="" width="72" height="72">
          <div><b>${esc(i.name)}</b><span>${esc(i.line)} · SL ${i.qty}</span></div>
          <span class="p">${money(i.lineTotal)}</span>
        </div>`,
      )
      .join('');
    $('[data-drawer-subtotal]', drawer).textContent = money(cart.subtotal - cart.discount);
    const ship = $('[data-ship-progress]', drawer);
    const threshold = cart.freeShipRemaining + (cart.subtotal - cart.discount);
    ship.innerHTML =
      cart.freeShipRemaining > 0
        ? `<span>Mua thêm <b style="color:var(--ink)">${money(cart.freeShipRemaining)}</b> để được miễn phí vận chuyển</span><div class="bar"><i style="width:${Math.min(100, Math.round(((threshold - cart.freeShipRemaining) / threshold) * 100))}%"></i></div>`
        : '<span style="color:var(--success);font-weight:600">Đơn hàng được miễn phí vận chuyển</span>';
    foot.hidden = false;
  }

  async function openDrawer() {
    if (!drawer) return;
    try {
      const res = await fetch('/api/cart', { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      renderDrawer(await res.json());
    } catch { /* fall through with stale content */ }
    openOverlay(drawer);
  }

  if (drawer) {
    $$('[data-drawer-close]', drawer).forEach((b) => b.addEventListener('click', () => closeOverlay(drawer)));
    drawer.addEventListener('keydown', (e) => trapFocus(drawer, e));
    $$('[data-cart-open]').forEach((a) => {
      if (location.pathname === '/gio-hang' || location.pathname === '/thanh-toan') return;
      a.addEventListener('click', (e) => { e.preventDefault(); openDrawer(); });
    });
  }

  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-add-to-cart]');
    if (!form) return;
    if (e.submitter?.name === 'redirect') return; // "Mua ngay" → normal submit to checkout
    e.preventDefault();
    const btn = e.submitter || $('button[type="submit"]', form);
    btn?.classList.add('is-loading');
    try {
      const data = Object.fromEntries(new FormData(form));
      const result = await post(form.action, data);
      if (result.cart) {
        updateCount(result.cart.count);
        renderDrawer(result.cart);
      }
      if (result.ok) openOverlay(drawer);
      toast(result.message, result.ok ? 'success' : 'error');
    } catch {
      form.submit();
    } finally {
      btn?.classList.remove('is-loading');
    }
  });

  /* ---------- Quantity steppers ---------- */
  $$('[data-stepper]').forEach((stepper) => {
    const input = $('input', stepper);
    const clamp = (v) => Math.max(Number(input.min) || 1, Math.min(Number(input.max) || 10, v));
    $$('[data-step]', stepper).forEach((b) =>
      b.addEventListener('click', () => {
        const next = clamp((parseInt(input.value, 10) || 1) + Number(b.dataset.step));
        if (String(next) === input.value) return;
        input.value = next;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }),
    );
    input.addEventListener('blur', () => { input.value = clamp(parseInt(input.value, 10) || 1); });
  });

  // Cart page: submit qty changes (debounced), then reload for fresh totals.
  $$('[data-qty-form]').forEach((form) => {
    let timer;
    form.addEventListener('change', () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const result = await post(form.action, Object.fromEntries(new FormData(form)));
        if (result.ok) location.reload();
        else toast(result.message, 'error');
      }, 450);
    });
  });

  /* ---------- Sort select auto-submit ---------- */
  $$('[data-autosubmit]').forEach((form) => form.addEventListener('change', () => form.submit()));

  /* ---------- Home: featured filter ---------- */
  const filterTabs = $('[data-filter-tabs]');
  const filterGrid = $('[data-filter-grid]');
  if (filterTabs && filterGrid) {
    filterTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      $$('[data-filter]', filterTabs).forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
      $$('[data-line]', filterGrid).forEach((item) => {
        item.style.display = btn.dataset.filter === 'all' || item.dataset.line === btn.dataset.filter ? 'contents' : 'none';
      });
    });
  }

  /* ---------- Product gallery ---------- */
  const gallery = $('[data-gallery]');
  if (gallery) {
    const main = $('[data-gallery-main]', gallery);
    $$('[data-gallery-thumb]', gallery).forEach((thumb) =>
      thumb.addEventListener('click', () => {
        $$('[data-gallery-thumb]', gallery).forEach((t) => t.setAttribute('aria-pressed', String(t === thumb)));
        main.style.opacity = '0';
        setTimeout(() => { main.src = thumb.dataset.galleryThumb; main.style.opacity = '1'; }, reduceMotion ? 0 : 150);
      }),
    );
  }

  /* ---------- Tabs (ARIA pattern with arrow keys) ---------- */
  $$('[data-tabs]').forEach((root) => {
    const tabs = $$('[role="tab"]', root);
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        select(next);
        next.focus();
      });
    });
  });

  /* ---------- Mobile buy bar ---------- */
  const buybar = $('[data-buybar]');
  const mainBuy = $('[data-main-buy]');
  if (buybar && mainBuy) {
    new IntersectionObserver(([entry]) => buybar.classList.toggle('is-visible', !entry.isIntersecting && entry.boundingClientRect.top < 0)).observe(mainBuy);
    $('[data-buybar-submit]', buybar).addEventListener('click', () => mainBuy.requestSubmit($('button[type="submit"]:not([name])', mainBuy)));
  }

  /* ---------- Checkout: prevent double submit ---------- */
  $$('form').forEach((form) => {
    const btn = $('[data-submit]', form);
    if (!btn) return;
    form.addEventListener('submit', () => {
      setTimeout(() => btn.classList.add('is-loading'), 0);
    });
  });
  $('[data-autofocus]')?.focus();

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    reveals.forEach((el) => io.observe(el));
  }
})();
