const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

const env = process.env;
const isProd = env.NODE_ENV === 'production';
const root = path.resolve(__dirname, '..');

function int(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

if (isProd && !env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required in production. Set it in your environment variables.');
}

const config = {
  isProd,
  root,
  port: int(env.PORT, 3000),
  baseUrl: (env.BASE_URL || env.RENDER_EXTERNAL_URL || `http://localhost:${int(env.PORT, 3000)}`).replace(/\/$/, ''),
  sessionSecret: env.SESSION_SECRET || 'dev-only-secret-change-me',
  trustProxy: env.TRUST_PROXY !== 'false',

  db: {
    client: env.DB_CLIENT || (env.DB_HOST ? 'mysql2' : 'better-sqlite3'),
    host: env.DB_HOST || '127.0.0.1',
    port: int(env.DB_PORT, 3306),
    user: env.DB_USER || '',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || '',
    filename: env.DB_FILE || path.join(root, 'data', 'prochef.sqlite'),
  },

  uploadDir: env.UPLOAD_DIR || path.join(root, 'public', 'uploads'),

  admin: {
    email: (env.ADMIN_EMAIL || 'admin@makxim.vn').toLowerCase(),
    password: env.ADMIN_PASSWORD || '',
  },

  momo: {
    enabled: Boolean(env.MOMO_PARTNER_CODE && env.MOMO_ACCESS_KEY && env.MOMO_SECRET_KEY),
    partnerCode: env.MOMO_PARTNER_CODE || '',
    accessKey: env.MOMO_ACCESS_KEY || '',
    secretKey: env.MOMO_SECRET_KEY || '',
    endpoint: (env.MOMO_ENDPOINT || 'https://test-payment.momo.vn').replace(/\/$/, ''),
    requestType: env.MOMO_REQUEST_TYPE || 'captureWallet',
  },

  smtp: {
    enabled: Boolean(env.SMTP_HOST && env.SMTP_USER),
    host: env.SMTP_HOST || '',
    port: int(env.SMTP_PORT, 465),
    user: env.SMTP_USER || '',
    password: env.SMTP_PASSWORD || '',
    from: env.SMTP_FROM || env.SMTP_USER || '',
  },

  shop: {
    name: 'Makxim ProChef',
    legalName: env.SHOP_LEGAL_NAME || 'Công ty Makxim',
    hotline: env.SHOP_HOTLINE || '1900 599 894',
    email: env.SHOP_EMAIL || 'kinhdoanh@makxim.vn',
    address: env.SHOP_ADDRESS || 'Hà Nội, Việt Nam',
    hours: env.SHOP_HOURS || '8:00 – 21:00, Thứ 2 – Chủ nhật',
    zaloUrl: env.ZALO_URL || '',
    messengerUrl: env.MESSENGER_URL || '',
    shippingFee: int(env.SHIPPING_FEE, 100000),
    freeShipFrom: int(env.FREE_SHIP_FROM, 5000000),
  },
};

module.exports = config;
