const fs = require('fs');
const path = require('path');
const knexFactory = require('knex');
const config = require('../config');

function buildKnexConfig() {
  const migrations = { directory: path.join(__dirname, 'migrations') };
  const { db } = config;

  if (db.client === 'mysql2') {
    return {
      client: 'mysql2',
      connection: {
        host: db.host,
        port: db.port,
        user: db.user,
        password: db.password,
        database: db.database,
        charset: 'utf8mb4',
        dateStrings: false,
      },
      pool: { min: 0, max: 8 },
      migrations,
    };
  }

  fs.mkdirSync(path.dirname(db.filename), { recursive: true });
  return {
    client: 'better-sqlite3',
    connection: { filename: db.filename },
    useNullAsDefault: true,
    migrations,
  };
}

const knex = knexFactory(buildKnexConfig());

const JSON_FIELDS = ['specs', 'features', 'images', 'highlights'];

function parseJson(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** Normalises a raw product row (JSON columns, booleans, discount). */
function hydrateProduct(row) {
  if (!row) return null;
  const product = { ...row };
  for (const field of JSON_FIELDS) {
    product[field] = parseJson(row[field], field === 'specs' ? [] : []);
  }
  product.is_active = Boolean(row.is_active);
  product.is_featured = Boolean(row.is_featured);
  product.image = product.images[0] || '/img/products/placeholder.svg';
  product.discountPercent =
    row.compare_price && row.compare_price > row.price
      ? Math.round((1 - row.price / row.compare_price) * 100)
      : 0;
  product.lineLabel = row.line === 'doi' ? 'Bếp từ đôi' : 'Bếp từ đơn';
  return product;
}

module.exports = { knex, hydrateProduct, parseJson };
