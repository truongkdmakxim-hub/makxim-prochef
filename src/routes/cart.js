const express = require('express');
const cartService = require('../services/cart');
const { knex } = require('../db');
const { flash, wantsJson } = require('../middleware');

const router = express.Router();

async function respond(req, res, message, { status = 200, type = 'success' } = {}) {
  const cart = await cartService.loadCart(req.session);
  if (wantsJson(req)) {
    return res.status(status).json({ ok: status < 400, message, cart: cartService.toJson(cart) });
  }
  if (message) flash(req, status < 400 ? type : 'error', message);
  return res.redirect(req.body.redirect === 'checkout' ? '/thanh-toan' : '/gio-hang');
}

router.get('/gio-hang', async (req, res) => {
  const cart = await cartService.loadCart(req.session);
  res.render('pages/cart', { meta: { title: 'Giỏ hàng', robots: 'noindex' }, cart });
});

router.get('/api/cart', async (req, res) => {
  const cart = await cartService.loadCart(req.session);
  res.json(cartService.toJson(cart));
});

router.post('/gio-hang/them', async (req, res) => {
  const productId = String(parseInt(req.body.productId, 10) || '');
  const product = productId && (await knex('products').where({ id: productId, is_active: true }).first());
  if (!product) return respond(req, res, 'Sản phẩm không tồn tại.', { status: 404 });

  const current = cartService.getRawCart(req.session)[productId] || 0;
  const wanted = current + Math.max(1, parseInt(req.body.qty, 10) || 1);
  if (product.stock <= 0) return respond(req, res, `${product.name} tạm hết hàng.`, { status: 409 });
  if (wanted > product.stock || wanted > cartService.MAX_QTY) {
    const limit = Math.min(product.stock, cartService.MAX_QTY);
    cartService.setQty(req.session, productId, limit);
    return respond(req, res, `Bạn chỉ có thể mua tối đa ${limit} sản phẩm ${product.name}.`, { type: 'info' });
  }
  cartService.addItem(req.session, productId, req.body.qty);
  if (req.body.redirect === 'checkout' && !wantsJson(req)) return res.redirect('/thanh-toan');
  return respond(req, res, `Đã thêm ${product.name} vào giỏ hàng.`);
});

router.post('/gio-hang/cap-nhat', async (req, res) => {
  const productId = String(parseInt(req.body.productId, 10) || '');
  if (productId) cartService.setQty(req.session, productId, req.body.qty);
  return respond(req, res, null);
});

router.post('/gio-hang/xoa', async (req, res) => {
  const productId = String(parseInt(req.body.productId, 10) || '');
  if (productId) cartService.setQty(req.session, productId, 0);
  return respond(req, res, 'Đã xóa sản phẩm khỏi giỏ hàng.');
});

router.post('/gio-hang/ma-giam-gia', async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase().slice(0, 40);
  if (!code || req.body.remove) {
    req.session.coupon = null;
    return respond(req, res, 'Đã bỏ mã giảm giá.');
  }
  const cart = await cartService.loadCart(req.session);
  const result = await cartService.evaluateCoupon(code, cart.subtotal);
  if (result.error) return respond(req, res, result.error, { status: 422 });
  req.session.coupon = result.coupon.code;
  return respond(req, res, `Đã áp dụng mã ${result.coupon.code}.`);
});

module.exports = router;
