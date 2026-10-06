const crypto = require('crypto');
const config = require('../config');
const cartService = require('../services/cart');
const format = require('../utils/format');
const { icon } = require('../utils/icons');

const ASSET_VERSION = Date.now().toString(36);

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Session-bound CSRF token (synchronizer pattern). */
function csrf(req, res, next) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(18).toString('base64url');
  res.locals.csrfToken = req.session.csrf;
  next();
}

function verifyCsrf(req, res, next) {
  const token = req.body?._csrf || req.get('x-csrf-token');
  if (safeEqual(token, req.session.csrf)) return next();
  const err = new Error('Phiên làm việc đã hết hạn. Vui lòng tải lại trang và thử lại.');
  err.status = 403;
  next(err);
}

/** CSRF check for every state-changing request except multipart (checked after multer) and webhooks. */
function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.path.startsWith('/api/momo/ipn')) return next();
  if (req.is('multipart/form-data')) return next();
  return verifyCsrf(req, res, next);
}

function flash(req, type, message) {
  req.session.flash = [...(req.session.flash || []), { type, message }];
}

function locals(req, res, next) {
  const flashes = req.session.flash || [];
  req.session.flash = undefined;
  Object.assign(res.locals, {
    shop: config.shop,
    baseUrl: config.baseUrl,
    currentPath: req.path,
    cartCount: config.staticMode ? 0 : cartService.cartCount(req.session),
    staticMode: config.staticMode,
    orderEndpoint: config.orderEndpoint,
    flashes,
    momoEnabled: config.momo.enabled && !config.staticMode,
    assetVersion: ASSET_VERSION,
    icon,
    fmt: format,
    meta: {},
  });
  next();
}

function wantsJson(req) {
  return req.xhr || req.get('accept')?.includes('application/json');
}

function requireAdmin(req, res, next) {
  if (req.session.adminId) return next();
  req.session.returnTo = req.originalUrl;
  return res.redirect('/admin/dang-nhap');
}

module.exports = { csrf, csrfGuard, verifyCsrf, flash, locals, wantsJson, requireAdmin };
