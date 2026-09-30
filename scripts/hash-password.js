// Đổi mật khẩu admin: npm run hash-password -- email@domain.vn "MatKhauMoi"
const bcrypt = require('bcryptjs');
const { knex } = require('../src/db');

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password || password.length < 10) {
    console.error('Usage: npm run hash-password -- <email> "<password, at least 10 chars>"');
    process.exitCode = 1;
    return;
  }
  const hash = await bcrypt.hash(password, 12);
  const normalized = email.toLowerCase();
  const updated = await knex('admin_users').where({ email: normalized }).update({ password_hash: hash, updated_at: knex.fn.now() });
  if (!updated) await knex('admin_users').insert({ email: normalized, name: 'Quản trị viên', password_hash: hash });
  console.log(`Password ${updated ? 'updated' : 'set (new admin)'} for ${normalized}.`);
}

main().finally(() => knex.destroy());
