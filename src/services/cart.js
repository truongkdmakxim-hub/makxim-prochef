const config = require('../config');
const { knex, hydrateProduct } = require('../db');
const { money } = require('../utils/format');

const MAX_QTY = 10;

function getRawCart(session) {
  const raw = session.cart && typeof session.cart === 'object' ? session.cart : {};
  const clean = {};
  for (const [id, qty] of Object.entries(raw)) {
    const n = Math.min(MAX_QTY, Math.max(0, parseInt(qty, 10) || 0));
    if (/^\d+$/.test(id) && n > 0) clean[id] = n;
  }
  return clean;
}

function setQty(session, productId, qty) {
  const cart = getRawCart(session);
  const n = Math.min(MAX_QTY, Math.max(0, parseInt(qty, 10) || 0));
  if (n === 0) delete cart[productId];
  else cart[productId] = n;
  session.cart = cart;
}

function addItem(session, productId, qty = 1) {
  const cart = getRawCart(session);
  setQty(session, productId, (cart[productId] || 0) + Math.max(1, parseInt(qty, 10) || 1));
}

function cartCount(session) {
  return Object.values(getRawCart(session)).reduce((sum, n) => sum + n, 0);
}

/** Validates a coupon against a subtotal. Returns { coupon, discount } or { error }. */
async function evaluateCoupon(code, subtotal, db = knex) {
  if (!code) return { coupon: null, discount: 0 };
  const coupon = await db('coupons').whereRaw('UPPER(code) = ?', [String(code).trim().toUpperCase()]).first();
  if (!coupon || !coupon.is_active) return { error: 'Mã giảm giá không tồn tại hoặc đã ngừng áp dụng.' };
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return { error: 'Mã giảm giá đã hết hạn.' };
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) return { error: 'Mã giảm giá đã hết lượt sử dụng.' };
  if (subtotal < coupon.min_order) {
    return { error: `Mã này áp dụng cho đơn từ ${money(coupon.min_order)}.` };
  }
  let discount = coupon.type === 'percent' ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount);
  return { coupon, discount: Math.min(discount, subtotal) };
}

function shippingFor(subtotalAfterDiscount) {
  if (subtotalAfterDiscount <= 0) return 0;
  return subtotalAfterDiscount >= config.shop.freeShipFrom ? 0 : config.shop.shippingFee;
}

/**
 * Loads the session cart with live product data and computes totals.
 * Items for products that no longer exist are dropped from the session.
 */
async function loadCart(session, db = knex) {
  const raw = getRawCart(session);
  const ids = Object.keys(raw).map(Number);
  const rows = ids.length ? await db('products').whereIn('id', ids).andWhere({ is_active: true }) : [];
  const products = new Map(rows.map((r) => [String(r.id), hydrateProduct(r)]));

  const items = [];
  const warnings = [];
  for (const [id, qty] of Object.entries(raw)) {
    const product = products.get(id);
    if (!product) {
      delete raw[id];
      continue;
    }
    let finalQty = qty;
    if (product.stock < qty) {
      finalQty = Math.max(0, product.stock);
      warnings.push(
        finalQty === 0
          ? `${product.name} vừa hết hàng và đã được bỏ khỏi giỏ.`
          : `${product.name} chỉ còn ${finalQty} sản phẩm — số lượng đã được điều chỉnh.`,
      );
    }
    if (finalQty === 0) {
      delete raw[id];
      continue;
    }
    raw[id] = finalQty;
    items.push({ product, qty: finalQty, lineTotal: product.price * finalQty });
  }
  session.cart = raw;

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  let couponResult = await evaluateCoupon(session.coupon, subtotal, db);
  if (couponResult.error) {
    if (session.coupon) warnings.push(`Mã ${session.coupon}: ${couponResult.error}`);
    session.coupon = null;
    couponResult = { coupon: null, discount: 0 };
  }
  const discount = couponResult.discount;
  const shippingFee = items.length ? shippingFor(subtotal - discount) : 0;

  return {
    items,
    count: items.reduce((sum, i) => sum + i.qty, 0),
    subtotal,
    discount,
    coupon: couponResult.coupon,
    shippingFee,
    total: subtotal - discount + shippingFee,
    freeShipRemaining: Math.max(0, config.shop.freeShipFrom - (subtotal - discount)),
    warnings,
  };
}

function toJson(cart) {
  return {
    count: cart.count,
    subtotal: cart.subtotal,
    discount: cart.discount,
    shippingFee: cart.shippingFee,
    total: cart.total,
    couponCode: cart.coupon?.code || null,
    freeShipRemaining: cart.freeShipRemaining,
    warnings: cart.warnings,
    items: cart.items.map((i) => ({
      id: i.product.id,
      slug: i.product.slug,
      name: i.product.name,
      line: i.product.lineLabel,
      image: i.product.image,
      price: i.product.price,
      qty: i.qty,
      stock: i.product.stock,
      lineTotal: i.lineTotal,
    })),
  };
}

module.exports = { MAX_QTY, getRawCart, setQty, addItem, cartCount, evaluateCoupon, loadCart, toJson };
