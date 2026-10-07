const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieSession = require('cookie-session');
const config = require('./config');
const { csrf, csrfGuard, locals } = require('./middleware');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          // style="" attributes only (layout tweaks, stagger delays) — scripts stay locked down.
          styleSrcAttr: ["'unsafe-inline'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          // Checkout form POST redirects to the MoMo gateway.
          formAction: ["'self'", 'https://*.momo.vn'],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: config.isProd ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());

  const staticOpts = { maxAge: config.isProd ? '7d' : 0 };
  app.use(express.static(path.join(__dirname, '..', 'public'), staticOpts));
  app.use('/uploads', express.static(config.uploadDir, staticOpts));

  app.use(express.urlencoded({ extended: false, limit: '200kb' }));
  app.use(
    cookieSession({
      name: 'pc_sess',
      keys: [config.sessionSecret],
      maxAge: 30 * 24 * 3600 * 1000,
      httpOnly: true,
      sameSite: 'lax',
      secure: config.isProd,
    }),
  );
  app.use(csrf);
  app.use(locals);
  app.use(csrfGuard);
  // "Tin tức" appears in the menus only once at least one post is published.
  app.use(async (req, res, next) => {
    if (req.path.startsWith('/admin')) return next();
    try {
      res.locals.hasPosts = (await require('./services/blog').countPublished()) > 0;
    } catch {
      res.locals.hasPosts = false;
    }
    next();
  });

  app.get('/healthz', (req, res) => res.json({ ok: true }));
  app.use(require('./routes/shop'));
  app.use(require('./routes/cart'));
  app.use(require('./routes/checkout'));
  app.use('/admin', require('./routes/admin'));

  app.use((req, res) => {
    res.status(404).render('pages/error', { meta: { title: 'Không tìm thấy trang' }, status: 404, message: 'Trang bạn tìm không tồn tại hoặc đã được di chuyển.' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    const message = status < 500 ? err.message : 'Đã có lỗi xảy ra. Vui lòng thử lại sau ít phút.';
    if (req.xhr || req.get('accept')?.includes('application/json')) return res.status(status).json({ ok: false, message });
    res.status(status).render('pages/error', { meta: { title: 'Có lỗi xảy ra' }, status, message }, (renderErr, html) => {
      if (renderErr) {
        console.error(renderErr);
        return res.type('text/plain').send(message);
      }
      res.send(html);
    });
  });

  return app;
}

module.exports = { createApp };
