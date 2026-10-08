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

  /* ---------- Static site: cart in localStorage, product data from /products.json ---------- */
  const isStatic = document.body.hasAttribute('data-static');
  const CART_KEY = 'pc_cart';
  const MAX_QTY = 10;
  const shipFee = Number(document.body.dataset.shipFee) || 0;
  const freeShipFrom = Number(document.body.dataset.freeShip) || 0;
  let catalogPromise = null;
  const loadCatalog = () => {
    catalogPromise ||= fetch('/products.json')
      .then((r) => r.json())
      .then((list) => new Map(list.map((p) => [String(p.id), p])))
      .catch((err) => { catalogPromise = null; throw err; });
    return catalogPromise;
  };
  function readCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch { return {}; }
  }
  function writeCart(raw) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(raw)); } catch { /* private mode */ }
  }
  const rawCount = (raw) => Object.values(raw).reduce((sum, n) => sum + (Number(n) || 0), 0);
  function setQty(id, qty) {
    const raw = readCart();
    const n = Math.min(MAX_QTY, Math.max(0, parseInt(qty, 10) || 0));
    if (n === 0) delete raw[id];
    else raw[id] = n;
    writeCart(raw);
  }
  async function staticCart() {
    const products = await loadCatalog();
    const raw = readCart();
    const items = [];
    for (const [id, qty] of Object.entries(raw)) {
      const p = products.get(id);
      if (!p || p.stock <= 0) { delete raw[id]; continue; }
      const n = Math.max(1, Math.min(Number(qty) || 1, p.stock, MAX_QTY));
      raw[id] = n;
      items.push({ id, product: p, name: p.name, image: p.image, line: p.line, qty: n, lineTotal: p.price * n });
    }
    writeCart(raw);
    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    const shippingFee = subtotal > 0 && subtotal < freeShipFrom ? shipFee : 0;
    return {
      items,
      count: items.reduce((sum, i) => sum + i.qty, 0),
      subtotal,
      discount: 0,
      shippingFee,
      total: subtotal + shippingFee,
      freeShipRemaining: subtotal > 0 ? Math.max(0, freeShipFrom - subtotal) : 0,
    };
  }
  function totalsHtml(cart) {
    const pct = freeShipFrom ? Math.min(100, Math.round(((freeShipFrom - cart.freeShipRemaining) / freeShipFrom) * 100)) : 100;
    return `<dl>
      <div><dt>Tạm tính</dt><dd>${money(cart.subtotal)}</dd></div>
      <div><dt>Phí vận chuyển</dt><dd>${cart.shippingFee ? money(cart.shippingFee) : 'Miễn phí'}</dd></div>
      <div class="grand"><dt>Tổng cộng</dt><dd>${money(cart.total)}</dd></div>
    </dl>${cart.freeShipRemaining > 0 ? `<div class="ship-progress" style="margin-top: 16px"><span>Mua thêm <b style="color: var(--ink)">${money(cart.freeShipRemaining)}</b> để được miễn phí vận chuyển</span><div class="bar"><i style="width: ${pct}%"></i></div></div>` : ''}`;
  }
  if (isStatic) updateCount(rawCount(readCart()));

  async function openDrawer() {
    if (!drawer) return;
    try {
      if (isStatic) renderDrawer(await staticCart());
      else {
        const res = await fetch('/api/cart', { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
        renderDrawer(await res.json());
      }
    } catch { /* fall through with stale content */ }
    openOverlay(drawer);
  }

  const pathname = location.pathname.replace(/\/$/, '');
  if (drawer) {
    $$('[data-drawer-close]', drawer).forEach((b) => b.addEventListener('click', () => closeOverlay(drawer)));
    drawer.addEventListener('keydown', (e) => trapFocus(drawer, e));
    $$('[data-cart-open]').forEach((a) => {
      if (pathname === '/gio-hang' || pathname === '/thanh-toan') return;
      a.addEventListener('click', (e) => { e.preventDefault(); openDrawer(); });
    });
  }

  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-add-to-cart]');
    if (!form) return;
    if (isStatic) {
      e.preventDefault();
      const id = String(form.elements.productId.value);
      const qty = Math.max(1, parseInt(form.elements.qty?.value, 10) || 1);
      const buyNow = e.submitter?.name === 'redirect';
      setQty(id, (readCart()[id] || 0) + qty);
      if (buyNow) { location.href = '/thanh-toan'; return; }
      try {
        const cart = await staticCart();
        const item = cart.items.find((i) => i.id === id);
        updateCount(cart.count);
        renderDrawer(cart);
        openOverlay(drawer);
        toast(item ? `Đã thêm ${item.name} vào giỏ hàng` : 'Đã thêm vào giỏ hàng');
      } catch {
        updateCount(rawCount(readCart()));
        toast('Đã thêm vào giỏ hàng');
      }
      return;
    }
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

  /* ---------- Static site: listing sort, cart page, checkout ---------- */
  const sortForm = $('[data-static-sort]');
  const sortGrid = $('[data-sort-grid]');
  if (sortForm && sortGrid) {
    const keyOf = {
      featured: (c) => Number(c.dataset.order),
      'price-asc': (c) => Number(c.dataset.price),
      'price-desc': (c) => -Number(c.dataset.price),
      newest: (c) => -Number(c.dataset.id),
    };
    const apply = (sort) => {
      const key = keyOf[sort] || keyOf.featured;
      $$('.product-card', sortGrid).sort((a, b) => key(a) - key(b)).forEach((c) => sortGrid.appendChild(c));
    };
    const select = $('select', sortForm);
    const initial = new URLSearchParams(location.search).get('sort');
    if (initial && keyOf[initial]) { select.value = initial; apply(initial); }
    sortForm.addEventListener('submit', (e) => e.preventDefault());
    select.addEventListener('change', () => {
      apply(select.value);
      const url = new URL(location.href);
      if (select.value === 'featured') url.searchParams.delete('sort');
      else url.searchParams.set('sort', select.value);
      history.replaceState(null, '', url);
    });
  }

  const cartPage = $('[data-static-cart]');
  if (cartPage) {
    const tpl = (name) => $(`template[data-icon-${name}]`)?.innerHTML || '';
    const render = async () => {
      const cart = await staticCart();
      updateCount(cart.count);
      $('[data-cart-empty]', cartPage).hidden = cart.items.length > 0;
      $('[data-cart-full]', cartPage).hidden = !cart.items.length;
      const countEl = $('[data-cart-summary-count]', cartPage);
      countEl.hidden = !cart.items.length;
      countEl.textContent = `${cart.count} sản phẩm`;
      $('[data-cart-list]', cartPage).innerHTML = cart.items
        .map(
          ({ id, product: p, qty, lineTotal }) => `<div class="cart-row">
          <a class="thumb" href="/san-pham/${esc(p.slug)}"><img src="${esc(p.image)}" alt="${esc(p.name)}" width="104" height="104"></a>
          <div class="info">
            <a href="/san-pham/${esc(p.slug)}">${esc(p.name)}</a>
            <span class="muted" style="font-size: .875rem">${esc(p.line)} · ${money(p.price)}</span>
            <div class="controls">
              <div class="stepper sm">
                <button type="button" data-qty="${esc(id)}" data-delta="-1" aria-label="Giảm số lượng ${esc(p.name)}">${tpl('minus')}</button>
                <input type="number" inputmode="numeric" min="1" max="${Math.min(MAX_QTY, p.stock)}" value="${qty}" data-qty-input="${esc(id)}" aria-label="Số lượng ${esc(p.name)}">
                <button type="button" data-qty="${esc(id)}" data-delta="1" aria-label="Tăng số lượng ${esc(p.name)}">${tpl('plus')}</button>
              </div>
              <button class="btn btn-ghost btn-icon" type="button" data-remove="${esc(id)}" aria-label="Xóa ${esc(p.name)} khỏi giỏ">${tpl('trash')}</button>
            </div>
          </div>
          <div class="total">${money(lineTotal)}</div>
        </div>`,
        )
        .join('');
      $('[data-cart-totals]', cartPage).innerHTML = totalsHtml(cart);
    };
    const rerender = () => render().catch(() => toast('Không tải được giỏ hàng, vui lòng tải lại trang.', 'error'));
    cartPage.addEventListener('click', (e) => {
      const step = e.target.closest('[data-qty]');
      const remove = e.target.closest('[data-remove]');
      if (step) {
        const id = step.dataset.qty;
        const next = (Number(readCart()[id]) || 0) + Number(step.dataset.delta);
        if (next >= 1) { setQty(id, next); rerender(); }
      } else if (remove) {
        setQty(remove.dataset.remove, 0);
        rerender();
      }
    });
    cartPage.addEventListener('change', (e) => {
      const input = e.target.closest('[data-qty-input]');
      if (input) { setQty(input.dataset.qtyInput, Math.max(1, parseInt(input.value, 10) || 1)); rerender(); }
    });
    rerender();
  }

  const checkoutPage = $('[data-static-checkout]');
  if (checkoutPage) {
    const form = $('[data-static-order]', checkoutPage);
    const errorBox = $('[data-form-error]', checkoutPage);
    const endpoint = $('meta[name="order-endpoint"]')?.content || '';
    let cart = null;
    const showError = (msg) => {
      $('span', errorBox).textContent = msg;
      errorBox.hidden = false;
      errorBox.focus();
    };
    staticCart()
      .then((c) => {
        cart = c;
        updateCount(c.count);
        if (!c.items.length) { $('[data-cart-empty]', checkoutPage).hidden = false; return; }
        form.hidden = false;
        $('[data-order-count]', form).textContent = `Đơn hàng (${c.count})`;
        $('[data-order-items]', form).innerHTML = c.items
          .map(
            ({ product: p, qty, lineTotal }) => `<div class="mini-item">
            <span class="qty-badge"><img src="${esc(p.image)}" alt="" width="56" height="56"><em>${qty}</em></span>
            <div><b>${esc(p.name)}</b><span>${esc(p.line)}</span></div>
            <span class="p">${money(lineTotal)}</span>
          </div>`,
          )
          .join('');
        $('[data-cart-totals]', form).innerHTML = totalsHtml(c);
        $('[data-submit]', form).textContent = `Đặt hàng · ${money(c.total)}`;
      })
      .catch(() => showError('Không tải được giỏ hàng, vui lòng tải lại trang.'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!cart?.items.length) return;
      const f = form.elements;
      const val = (k) => (f[k]?.value || '').trim();
      const phone = val('phone').replace(/[\s.-]/g, '');
      const checks = {
        customer_name: val('customer_name').length >= 2,
        phone: /^0\d{9,10}$/.test(phone),
        email: !val('email') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email')),
        province: Boolean(val('province')),
        ward: Boolean(val('ward')),
        address: Boolean(val('address')),
      };
      Object.entries(checks).forEach(([k, ok]) => f[k].closest('.field').classList.toggle('has-error', !ok));
      const bad = Object.keys(checks).find((k) => !checks[k]);
      if (bad) {
        f[bad].focus();
        toast(bad === 'phone' ? 'Số điện thoại chưa đúng (10–11 số, bắt đầu bằng 0).' : 'Vui lòng điền đủ thông tin được đánh dấu.', 'error');
        return;
      }
      if (!endpoint) {
        showError('Đặt hàng online đang tạm gián đoạn. Vui lòng gọi hotline hoặc nhắn Zalo để được hỗ trợ ngay.');
        return;
      }
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const code = `PC${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const qs = new URLSearchParams(location.search);
      const utm = (k) => {
        try { return qs.get(k) || sessionStorage.getItem(k) || ''; } catch { return qs.get(k) || ''; }
      };
      const data = new URLSearchParams({
        code,
        name: val('customer_name'),
        phone,
        email: val('email'),
        province: val('province'),
        ward: val('ward'),
        address: val('address'),
        note: val('note'),
        items: cart.items.map((i) => `${i.name} x${i.qty} = ${money(i.lineTotal)}`).join('\n'),
        subtotal: cart.subtotal,
        shipping: cart.shippingFee,
        total: cart.total,
        website: val('website'),
        page: location.href,
        utm_source: utm('utm_source'),
        utm_campaign: utm('utm_campaign'),
      });
      const btn = $('[data-submit]', form);
      btn.classList.add('is-loading');
      btn.disabled = true;
      try {
        // no-cors: Apps Script does not send CORS headers; the row is still written.
        await fetch(endpoint, { method: 'POST', mode: 'no-cors', body: data });
      } catch {
        btn.classList.remove('is-loading');
        btn.disabled = false;
        showError('Chưa gửi được đơn hàng. Vui lòng kiểm tra kết nối mạng và thử lại, hoặc gọi hotline.');
        return;
      }
      writeCart({});
      updateCount(0);
      form.hidden = true;
      errorBox.hidden = true;
      const done = $('[data-order-done]', checkoutPage);
      $('[data-order-code]', done).textContent = code;
      done.hidden = false;
      window.scrollTo({ top: 0 });
      done.focus();
      if (window.gtag) window.gtag('event', 'purchase', { transaction_id: code, value: cart.total, currency: 'VND' });
      if (window.fbq) window.fbq('track', 'Purchase', { value: cart.total, currency: 'VND' });
    });
  }

  if (isStatic) {
    // Keep ad attribution across pages until checkout.
    const qs = new URLSearchParams(location.search);
    ['utm_source', 'utm_campaign'].forEach((k) => {
      if (qs.get(k)) try { sessionStorage.setItem(k, qs.get(k)); } catch { /* ignore */ }
    });
  }

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
