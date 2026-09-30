const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { knex } = require('./index');
const seed = require('./seed-data');

const JSON_FIELDS = ['highlights', 'specs', 'features', 'images'];

function serializeProduct(product) {
  const row = { ...product };
  for (const field of JSON_FIELDS) row[field] = JSON.stringify(product[field] || []);
  return row;
}

async function seedCatalog() {
  const [{ count }] = await knex('products').count({ count: '*' });
  if (Number(count) > 0) return;
  await knex('products').insert(seed.products.map(serializeProduct));
  await knex('coupons').insert(seed.coupons);
  console.log(`[setup] Seeded ${seed.products.length} products and ${seed.coupons.length} coupons.`);
}

async function ensureAdmin() {
  const { email } = config.admin;
  const existing = await knex('admin_users').where({ email }).first();
  if (existing) return;

  let password = config.admin.password;
  let generated = false;
  if (!password) {
    if (config.isProd) {
      console.warn('[setup] No admin exists and ADMIN_PASSWORD is not set — admin login is disabled until you set it.');
      return;
    }
    password = crypto.randomBytes(9).toString('base64url');
    generated = true;
  }

  await knex('admin_users').insert({
    email,
    name: 'Quản trị viên',
    password_hash: await bcrypt.hash(password, 12),
  });
  console.log(`[setup] Admin account created for ${email}.`);
  if (generated) console.log(`[setup] Dev admin password (shown once): ${password}`);
}

async function setupDatabase() {
  await knex.migrate.latest();
  await seedCatalog();
  await ensureAdmin();
}

module.exports = { setupDatabase, serializeProduct };
