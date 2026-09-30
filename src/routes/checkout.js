const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { knex } = require('../db');
const cartService = require('../services/cart');
const orders = require('../services/orders');
const momo = require('../services/momo');
const mailer = require('../services/mailer');
const { flash } = require('../middleware');
const { PROVINCES } = require('../utils/format');

const router = express.Router();

const checkoutLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });

function orderUrl(order) {
  return `/don-hang/${order.code}?t=${order.access_token}`;
}

function renderCheckout(res, { cart, values = {}, errors = {}, formError = null, status = 200 }) {
  res.status(status).render('pages/checkout', {
    meta: { title: 'Thanh toán', robots: 'noindex' },
    cart,
    values,
    errors,
    formError,
    provinces: PROVINCES,
    momoLimit: momo.MAX_AMOUNT,
  });
}

router.get('/thanh-toan', async (req, res) => {
  const cart = await cartService.loadCart(req.session);
  if (!cart.items.length) {
    flash(req, 'info', 'Giỏ hàng của bạn đang trống.');
    return res.redirect('/gio-hang');
  }
  renderCheckout(res, { cart, values: req.session.lastCustomer || {} });
});

async function startMomo(order) {
  const { payUrl, momoOrderId } = await momo.createPayment({
    orderCode: order.code,
    amount: order.total,
    orderInfo: `Thanh toan don hang ${order.code}`,
  });
  await knex('orders').where({ id: order.id }).update({ momo_order_id: momoOrderId, updated_at: knex.fn.now() });
  return payUrl;
}

router.post('/thanh-toan', checkoutLimiter, async (req, res) => {
  const { values, errors } = orders.validateCheckout(req.body, { momoEnabled: config.momo.enabled });
  const cart = await cartService.loadCart(req.session);
  if (!cart.items.length) return res.redirect('/gio-hang');
  if (values.payment_method === 'momo' && !momo.isAmountSupported(cart.total)) {
    errors.payment_method = 'Giá trị đơn vượt hạn mức MoMo (50.000.000₫). Vui lòng chọn COD.';
  }
  if (Object.keys(errors).length) {
    return renderCheckout(res, { cart, values, errors, status: 422, formError: 'Vui lòng kiểm tra lại các thông tin được đánh dấu.' });
  }

  let created;
  try {
    created = await orders.createOrder(req.session, values);
  } catch (err) {
    if (!(err instanceof orders.CheckoutError)) throw err;
    const fresh = await cartService.loadCart(req.session);
    return renderCheckout(res, { cart: fresh, values, errors: {}, status: 409, formError: err.message });
  }

  const { order, items } = created;
  req.session.cart = {};
  req.session.coupon = null;
  req.session.lastCustomer = {
    customer_name: values.customer_name, phone: values.phone, email: values.email,
    province: values.province, ward: values.ward, address: values.address,
  };
  mailer.sendOrderEmails(order, items).catch((e) => console.error('[mail]', e.message));

  if (order.payment_method === 'momo') {
    try {
      return res.redirect(await startMomo(order));
    } catch (err) {
      console.error('[momo] create payment failed:', err.message, err.momo || '');
      flash(req, 'error', 'Chưa kết nối được cổng MoMo. Đơn hàng đã được lưu — bạn có thể thử thanh toán lại hoặc liên hệ hotline.');
    }
  }
  res.redirect(orderUrl(order));
});

async function loadAuthorizedOrder(req) {
  const order = await orders.findByCode(req.params.code);
  if (!order || !req.query.t || req.query.t !== order.access_token) return null;
  return order;
}

router.get('/don-hang/:code', async (req, res, next) => {
  const order = await loadAuthorizedOrder(req);
  if (!order) return next();
  const items = await orders.getItems(order.id);
  res.render('pages/order', {
    meta: { title: `Đơn hàng ${order.code}`, robots: 'noindex' },
    order,
    items,
    canPayMomo:
      config.momo.enabled && order.payment_method === 'momo' && order.payment_status !== 'paid' && order.status !== 'cancelled',
  });
});

router.post('/don-hang/:code/thanh-toan-momo', checkoutLimiter, async (req, res, next) => {
  const order = await orders.findByCode(req.params.code);
  if (!order || req.body.t !== order.access_token) return next();
  if (order.payment_status === 'paid' || order.status === 'cancelled' || !config.momo.enabled) return res.redirect(orderUrl(order));
  try {
    return res.redirect(await startMomo(order));
  } catch (err) {
    console.error('[momo] retry failed:', err.message);
    flash(req, 'error', 'Chưa kết nối được cổng MoMo, vui lòng thử lại sau ít phút.');
    return res.redirect(orderUrl(order));
  }
});

/** Applies a verified MoMo result to its order. Idempotent. */
async function applyMomoResult(p) {
  const order = await knex('orders').where({ momo_order_id: p.orderId }).first();
  if (!order) return null;
  if (order.payment_status === 'paid') return order;
  const success = Number(p.resultCode) === 0 && Number(p.amount) === Number(order.total);
  const patch = success
    ? { payment_status: 'paid', momo_trans_id: String(p.transId), status: order.status === 'new' ? 'confirmed' : order.status }
    : { payment_status: 'failed' };
  await knex('orders').where({ id: order.id }).update({ ...patch, updated_at: knex.fn.now() });
  return { ...order, ...patch };
}

// Browser redirect after payment (user-facing).
router.get('/thanh-toan/momo/ket-qua', async (req, res, next) => {
  if (!config.momo.enabled || !momo.verifyResult(req.query)) {
    flash(req, 'error', 'Không xác thực được kết quả thanh toán MoMo.');
    return res.redirect('/tra-cuu-don-hang');
  }
  const order = await applyMomoResult(req.query);
  if (!order) return next();
  flash(
    req,
    order.payment_status === 'paid' ? 'success' : 'error',
    order.payment_status === 'paid' ? 'Thanh toán MoMo thành công. Cảm ơn bạn!' : `Thanh toán chưa thành công: ${req.query.message || 'giao dịch bị hủy'}.`,
  );
  res.redirect(orderUrl(order));
});

// Server-to-server notification from MoMo.
router.post('/api/momo/ipn', express.json(), async (req, res) => {
  if (!config.momo.enabled || !momo.verifyResult(req.body || {})) return res.status(400).json({ message: 'invalid signature' });
  await applyMomoResult(req.body);
  res.status(204).end();
});

module.exports = router;
