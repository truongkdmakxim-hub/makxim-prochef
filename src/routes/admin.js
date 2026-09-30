const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { knex, hydrateProduct } = require('../db');
const { serializeProduct } = require('../db/setup');
const orders = require('../services/orders');
const { flash, requireAdmin, verifyCsrf } = require('../middleware');
const { slugify, ORDER_STATUS, PAYMENT_STATUS } = require('../utils/format');

const router = express.Router();

fs.mkdirSync(config.uploadDir, { recursive: true });
const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' };
const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (req, file, cb) => cb(null, `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}${IMAGE_TYPES[file.mimetype]}`),
  }),
  limits: { fileSize: 4 * 1024 * 1024, files: 8 },
  fileFilter: (req, file, cb) => cb(null, Boolean(IMAGE_TYPES[file.mimetype])),
});

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });

router.use((req, res, next) => {
  res.locals.adminPath = req.path;
  res.locals.ORDER_STATUS = ORDER_STATUS;
  res.locals.PAYMENT_STATUS = PAYMENT_STATUS;
  res.set('X-Robots-Tag', 'noindex');
  next();
});

/* ---------- Auth ---------- */

router.get('/dang-nhap', (req, res) => {
  if (req.session.adminId) return res.redirect('/admin');
  res.render('admin/login', { meta: { title: 'Đăng nhập quản trị' }, error: null, email: '' });
});

router.post('/dang-nhap', loginLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await knex('admin_users').where({ email }).first();
  const ok = user && (await bcrypt.compare(String(req.body.password || ''), user.password_hash));
  if (!ok) {
    return res.status(401).render('admin/login', { meta: { title: 'Đăng nhập quản trị' }, error: 'Email hoặc mật khẩu không đúng.', email });
  }
  const returnTo = req.session.returnTo?.startsWith('/admin') ? req.session.returnTo : '/admin';
  req.session.returnTo = null;
  req.session.adminId = user.id;
  req.session.adminName = user.name || user.email;
  req.session.csrf = crypto.randomBytes(18).toString('base64url'); // rotate on privilege change
  res.redirect(returnTo);
});

router.post('/dang-xuat', (req, res) => {
  req.session = null;
  res.redirect('/admin/dang-nhap');
});

router.use(requireAdmin);
router.use((req, res, next) => {
  res.locals.adminName = req.session.adminName;
  next();
});

/* ---------- Dashboard ---------- */

router.get('/', async (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [revenue] = await knex('orders')
    .whereNot({ status: 'cancelled' })
    .andWhere('created_at', '>=', since)
    .sum({ total: 'total' })
    .count({ count: '*' });
  const [pending] = await knex('orders').where({ status: 'new' }).count({ count: '*' });
  const lowStock = (await knex('products').where('stock', '<=', 5).andWhere({ is_active: true }).orderBy('stock')).map(hydrateProduct);
  const recent = await knex('orders').orderBy('id', 'desc').limit(8);
  const topProducts = await knex('order_items')
    .join('orders', 'orders.id', 'order_items.order_id')
    .whereNot('orders.status', 'cancelled')
    .groupBy('order_items.name')
    .select('order_items.name')
    .sum({ qty: 'order_items.qty' })
    .sum({ revenue: 'order_items.line_total' })
    .orderBy('qty', 'desc')
    .limit(5);

  res.render('admin/dashboard', {
    meta: { title: 'Tổng quan' },
    stats: {
      revenue: Number(revenue?.total) || 0,
      orders: Number(revenue?.count) || 0,
      pending: Number(pending?.count) || 0,
      avg: revenue?.count ? Math.round(Number(revenue.total) / Number(revenue.count)) : 0,
    },
    lowStock,
    recent,
    topProducts,
  });
});

/* ---------- Orders ---------- */

const PAGE_SIZE = 20;

router.get('/don-hang', async (req, res) => {
  const status = ORDER_STATUS[req.query.status] ? req.query.status : '';
  const q = String(req.query.q || '').trim().slice(0, 60);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  const base = knex('orders').modify((qb) => {
    if (status) qb.where({ status });
    if (q) qb.where((w) => w.where('code', 'like', `%${q.toUpperCase()}%`).orWhere('phone', 'like', `%${q}%`).orWhere('customer_name', 'like', `%${q}%`));
  });
  const [{ count }] = await base.clone().count({ count: '*' });
  const list = await base.clone().orderBy('id', 'desc').limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);
  const counts = Object.fromEntries((await knex('orders').select('status').count({ n: '*' }).groupBy('status')).map((r) => [r.status, Number(r.n)]));

  res.render('admin/orders', {
    meta: { title: 'Đơn hàng' },
    list,
    status,
    q,
    page,
    pages: Math.max(1, Math.ceil(Number(count) / PAGE_SIZE)),
    total: Number(count),
    counts,
  });
});

router.get('/don-hang/:id', async (req, res, next) => {
  const order = await knex('orders').where({ id: req.params.id }).first();
  if (!order) return next();
  const items = await orders.getItems(order.id);
  res.render('admin/order', { meta: { title: `Đơn ${order.code}` }, order, items });
});

router.post('/don-hang/:id', async (req, res, next) => {
  const order = await knex('orders').where({ id: req.params.id }).first();
  if (!order) return next();
  const status = ORDER_STATUS[req.body.status] ? req.body.status : order.status;
  const paymentStatus = PAYMENT_STATUS[req.body.payment_status] ? req.body.payment_status : order.payment_status;

  await knex.transaction(async (trx) => {
    if (status === 'cancelled' && order.status !== 'cancelled') await orders.restock(trx, order.id);
    if (order.status === 'cancelled' && status !== 'cancelled') {
      for (const item of await trx('order_items').where({ order_id: order.id })) {
        if (item.product_id) await trx('products').where({ id: item.product_id }).decrement('stock', item.qty);
      }
    }
    await trx('orders').where({ id: order.id }).update({
      status,
      payment_status: paymentStatus,
      admin_note: String(req.body.admin_note || '').slice(0, 1000) || null,
      updated_at: trx.fn.now(),
    });
  });
  flash(req, 'success', `Đã cập nhật đơn ${order.code}.`);
  res.redirect(`/admin/don-hang/${order.id}`);
});

/* ---------- Products ---------- */

router.get('/san-pham', async (req, res) => {
  const products = (await knex('products').orderBy([{ column: 'line' }, { column: 'sort_order' }])).map(hydrateProduct);
  res.render('admin/products', { meta: { title: 'Sản phẩm' }, products });
});

const EMPTY_PRODUCT = {
  line: 'don', zones: 1, stock: 0, is_active: true, is_featured: false, sort_order: 0,
  highlights: [], specs: [], features: [], images: [],
};

router.get('/san-pham/moi', (req, res) => {
  res.render('admin/product-form', { meta: { title: 'Thêm sản phẩm' }, product: EMPTY_PRODUCT, errors: {}, isNew: true });
});

router.get('/san-pham/:id', async (req, res, next) => {
  const product = hydrateProduct(await knex('products').where({ id: req.params.id }).first());
  if (!product) return next();
  res.render('admin/product-form', { meta: { title: product.name }, product, errors: {}, isNew: false });
});

const lines = (text) => String(text || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
const intOrNull = (v) => (v === '' || v == null ? null : Math.max(0, parseInt(String(v).replace(/\D/g, ''), 10) || 0));

function readProductForm(body, files, existing) {
  const keep = [].concat(body.keep_images || []).filter((u) => existing?.images?.includes(u));
  const uploaded = (files || []).map((f) => `/uploads/${f.filename}`);
  const p = {
    name: String(body.name || '').trim().slice(0, 160),
    slug: slugify(body.slug || body.name || ''),
    sku: String(body.sku || '').trim().toUpperCase().slice(0, 60),
    line: body.line === 'doi' ? 'doi' : 'don',
    tagline: String(body.tagline || '').trim().slice(0, 255) || null,
    short_desc: String(body.short_desc || '').trim().slice(0, 500) || null,
    description: String(body.description || '').trim() || null,
    price: intOrNull(body.price) || 0,
    compare_price: intOrNull(body.compare_price),
    stock: intOrNull(body.stock) || 0,
    power_w: intOrNull(body.power_w),
    zones: body.line === 'doi' ? 2 : 1,
    badge: String(body.badge || '').trim().slice(0, 40) || null,
    sort_order: parseInt(body.sort_order, 10) || 0,
    is_active: body.is_active === 'on',
    is_featured: body.is_featured === 'on',
    highlights: lines(body.highlights).slice(0, 4),
    features: lines(body.features),
    specs: lines(body.specs).map((l) => {
      const i = l.indexOf(':');
      return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l, ''];
    }),
    images: [...keep, ...uploaded, ...lines(body.image_urls).filter((u) => /^(https?:\/\/|\/)/.test(u))],
  };
  const errors = {};
  if (p.name.length < 2) errors.name = 'Nhập tên sản phẩm.';
  if (!p.slug) errors.slug = 'Đường dẫn không hợp lệ.';
  if (!p.sku) errors.sku = 'Nhập mã SKU.';
  if (!p.price) errors.price = 'Nhập giá bán.';
  if (p.compare_price && p.compare_price <= p.price) p.compare_price = null;
  return { p, errors };
}

async function saveProduct(req, res, existing) {
  const { p, errors } = readProductForm(req.body, req.files, existing);
  const clash = await knex('products')
    .where((w) => w.where({ slug: p.slug }).orWhere({ sku: p.sku }))
    .modify((q) => existing && q.whereNot({ id: existing.id }))
    .first();
  if (clash) errors[clash.slug === p.slug ? 'slug' : 'sku'] = 'Giá trị này đã được dùng cho sản phẩm khác.';

  if (Object.keys(errors).length) {
    return res.status(422).render('admin/product-form', {
      meta: { title: existing ? existing.name : 'Thêm sản phẩm' },
      product: { ...existing, ...p },
      errors,
      isNew: !existing,
    });
  }
  const row = serializeProduct(p);
  if (existing) {
    await knex('products').where({ id: existing.id }).update({ ...row, updated_at: knex.fn.now() });
  } else {
    await knex('products').insert(row);
  }
  flash(req, 'success', `Đã lưu sản phẩm ${p.name}.`);
  res.redirect('/admin/san-pham');
}

router.post('/san-pham/moi', upload.array('images', 8), verifyCsrf, (req, res) => saveProduct(req, res, null));

router.post('/san-pham/:id', upload.array('images', 8), verifyCsrf, async (req, res, next) => {
  const existing = hydrateProduct(await knex('products').where({ id: req.params.id }).first());
  if (!existing) return next();
  return saveProduct(req, res, existing);
});

router.post('/san-pham/:id/an-hien', async (req, res) => {
  const product = await knex('products').where({ id: req.params.id }).first();
  if (product) {
    await knex('products').where({ id: product.id }).update({ is_active: !product.is_active, updated_at: knex.fn.now() });
    flash(req, 'success', `${product.name} đã được ${product.is_active ? 'ẩn khỏi' : 'hiển thị trên'} cửa hàng.`);
  }
  res.redirect('/admin/san-pham');
});

/* ---------- Coupons ---------- */

router.get('/ma-giam-gia', async (req, res) => {
  const coupons = await knex('coupons').orderBy('id', 'desc');
  res.render('admin/coupons', { meta: { title: 'Mã giảm giá' }, coupons, values: {}, error: null });
});

router.post('/ma-giam-gia', async (req, res) => {
  const values = {
    code: String(req.body.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40),
    type: req.body.type === 'fixed' ? 'fixed' : 'percent',
    value: intOrNull(req.body.value) || 0,
    min_order: intOrNull(req.body.min_order) || 0,
    max_discount: intOrNull(req.body.max_discount),
    max_uses: intOrNull(req.body.max_uses),
    expires_at: req.body.expires_at ? new Date(`${req.body.expires_at}T23:59:59+07:00`) : null,
  };
  let error = null;
  if (values.code.length < 3) error = 'Mã cần ít nhất 3 ký tự (chữ, số, - hoặc _).';
  else if (!values.value || (values.type === 'percent' && values.value > 90)) error = 'Giá trị giảm không hợp lệ (phần trăm tối đa 90).';
  else if (await knex('coupons').where({ code: values.code }).first()) error = 'Mã này đã tồn tại.';

  if (error) {
    const coupons = await knex('coupons').orderBy('id', 'desc');
    return res.status(422).render('admin/coupons', { meta: { title: 'Mã giảm giá' }, coupons, values: req.body, error });
  }
  await knex('coupons').insert(values);
  flash(req, 'success', `Đã tạo mã ${values.code}.`);
  res.redirect('/admin/ma-giam-gia');
});

router.post('/ma-giam-gia/:id/an-hien', async (req, res) => {
  const coupon = await knex('coupons').where({ id: req.params.id }).first();
  if (coupon) await knex('coupons').where({ id: coupon.id }).update({ is_active: !coupon.is_active, updated_at: knex.fn.now() });
  res.redirect('/admin/ma-giam-gia');
});

router.post('/ma-giam-gia/:id/xoa', async (req, res) => {
  await knex('coupons').where({ id: req.params.id }).del();
  flash(req, 'success', 'Đã xóa mã giảm giá.');
  res.redirect('/admin/ma-giam-gia');
});

module.exports = router;
