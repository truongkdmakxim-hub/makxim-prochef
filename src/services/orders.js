const crypto = require('crypto');
const { knex } = require('../db');
const cartService = require('./cart');
const { PROVINCES } = require('../utils/format');

class CheckoutError extends Error {}

function newOrderCode() {
  const d = new Date(Date.now() + 7 * 3600 * 1000); // Asia/Ho_Chi_Minh
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = crypto.randomInt(0, 36 ** 4).toString(36).toUpperCase().padStart(4, '0');
  return `PC${ymd}${rand}`;
}

const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns { values, errors } for the checkout form. */
function validateCheckout(body, { momoEnabled }) {
  const v = {
    customer_name: String(body.customer_name || '').trim().slice(0, 120),
    phone: String(body.phone || '').replace(/[\s.-]/g, ''),
    email: String(body.email || '').trim().toLowerCase().slice(0, 160),
    province: String(body.province || '').trim(),
    ward: String(body.ward || '').trim().slice(0, 120),
    address: String(body.address || '').trim().slice(0, 255),
    note: String(body.note || '').trim().slice(0, 500),
    payment_method: body.payment_method === 'momo' ? 'momo' : 'cod',
  };
  const errors = {};
  if (v.customer_name.length < 2) errors.customer_name = 'Vui lòng nhập họ tên người nhận.';
  if (!PHONE_RE.test(v.phone)) errors.phone = 'Số điện thoại chưa đúng (VD: 0912 345 678).';
  if (v.email && !EMAIL_RE.test(v.email)) errors.email = 'Email chưa đúng định dạng.';
  if (!PROVINCES.includes(v.province)) errors.province = 'Vui lòng chọn tỉnh/thành phố.';
  if (v.ward.length < 2) errors.ward = 'Vui lòng nhập phường/xã.';
  if (v.address.length < 5) errors.address = 'Vui lòng nhập số nhà, tên đường.';
  if (v.payment_method === 'momo' && !momoEnabled) errors.payment_method = 'Thanh toán MoMo tạm thời chưa khả dụng.';
  return { values: v, errors };
}

/**
 * Creates the order atomically: re-prices the cart, reserves stock and
 * consumes the coupon inside one transaction.
 */
async function createOrder(session, values) {
  return knex.transaction(async (trx) => {
    const cart = await cartService.loadCart(session, trx);
    if (!cart.items.length) throw new CheckoutError('Giỏ hàng trống hoặc sản phẩm đã hết hàng.');
    if (cart.warnings.length) throw new CheckoutError(cart.warnings.join(' '));

    for (const item of cart.items) {
      const updated = await trx('products')
        .where({ id: item.product.id })
        .andWhere('stock', '>=', item.qty)
        .decrement('stock', item.qty);
      if (!updated) throw new CheckoutError(`${item.product.name} không còn đủ hàng. Vui lòng kiểm tra lại giỏ.`);
    }

    if (cart.coupon) {
      const q = trx('coupons').where({ id: cart.coupon.id });
      if (cart.coupon.max_uses != null) q.andWhere('used_count', '<', cart.coupon.max_uses);
      const updated = await q.increment('used_count', 1);
      if (!updated) throw new CheckoutError('Mã giảm giá vừa hết lượt sử dụng.');
    }

    let code = newOrderCode();
    while (await trx('orders').where({ code }).first()) code = newOrderCode();

    const order = {
      ...values,
      email: values.email || null,
      note: values.note || null,
      code,
      access_token: crypto.randomBytes(24).toString('base64url'),
      subtotal: cart.subtotal,
      discount: cart.discount,
      shipping_fee: cart.shippingFee,
      total: cart.total,
      coupon_code: cart.coupon?.code || null,
      payment_status: 'pending',
      status: 'new',
    };
    // Both mysql2 and better-sqlite3 resolve insert() to [insertId].
    const [orderId] = await trx('orders').insert(order);

    const items = cart.items.map((i) => ({
      order_id: orderId,
      product_id: i.product.id,
      name: i.product.name,
      sku: i.product.sku,
      image: i.product.image,
      price: i.product.price,
      qty: i.qty,
      line_total: i.lineTotal,
    }));
    await trx('order_items').insert(items);

    return { order: { ...order, id: orderId }, items };
  });
}

async function findByCode(code) {
  return knex('orders').where({ code: String(code || '').toUpperCase() }).first();
}

async function getItems(orderId) {
  return knex('order_items').where({ order_id: orderId }).orderBy('id');
}

/** Returns stock to inventory when an order is cancelled. */
async function restock(trx, orderId) {
  const items = await trx('order_items').where({ order_id: orderId });
  for (const item of items) {
    if (item.product_id) await trx('products').where({ id: item.product_id }).increment('stock', item.qty);
  }
}

module.exports = { CheckoutError, validateCheckout, createOrder, findByCode, getItems, restock, PHONE_RE };
