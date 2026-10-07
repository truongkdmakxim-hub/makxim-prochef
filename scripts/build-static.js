// Xuất website ra thư mục dist/ (HTML tĩnh) để đăng lên GitHub Pages.
// Dữ liệu sản phẩm lấy từ database đang dùng trên máy (data/prochef.sqlite hoặc MySQL theo .env).
//   npm run build:static
process.env.STATIC_SITE = '1';
process.env.NODE_ENV = 'development';
process.env.BASE_URL = process.env.STATIC_BASE_URL || 'https://prochef.makxim.vn';

const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const { setupDatabase } = require('../src/db/setup');
const { createApp } = require('../src/app');
const { knex } = require('../src/db');
const { pages } = require('../src/content');
const blog = require('../src/services/blog');

const OUT = path.join(config.root, 'dist');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function outFile(urlPath) {
  if (urlPath === '/') return path.join(OUT, 'index.html');
  if (path.extname(urlPath)) return path.join(OUT, urlPath);
  return path.join(OUT, urlPath, 'index.html');
}

async function main() {
  await setupDatabase();
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  fs.rmSync(OUT, { recursive: true, force: true });
  copyDir(path.join(config.root, 'public'), OUT);
  if (path.resolve(config.uploadDir) !== path.join(config.root, 'public', 'uploads')) copyDir(config.uploadDir, path.join(OUT, 'uploads'));

  const products = await knex('products').where({ is_active: true }).select('slug');
  const posts = await knex('posts').where({ is_published: true }).select('slug');
  const blogPages = Array.from({ length: Math.max(0, Math.ceil(posts.length / blog.PAGE_SIZE) - 1) }, (_, i) => `/tin-tuc/trang/${i + 2}`);
  const routes = [
    '/', '/san-pham', '/bep-tu-don', '/bep-tu-doi', '/so-sanh', '/lien-he', '/gioi-thieu',
    '/gio-hang', '/thanh-toan',
    ...Object.keys(pages).filter((s) => s !== 'gioi-thieu').map((s) => `/chinh-sach/${s}`),
    ...products.map((p) => `/san-pham/${p.slug}`),
    ...(posts.length ? ['/tin-tuc'] : []), ...blogPages, ...posts.map((p) => `/tin-tuc/${p.slug}`),
    '/products.json', '/sitemap.xml', '/robots.txt',
  ];

  for (const route of routes) {
    const res = await fetch(origin + route);
    if (!res.ok) throw new Error(`${route} → HTTP ${res.status}`);
    const file = outFile(route);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log('  ✓', route);
  }

  const notFound = await fetch(`${origin}/__404__`);
  fs.writeFileSync(path.join(OUT, '404.html'), await notFound.text());
  fs.writeFileSync(path.join(OUT, 'CNAME'), `${new URL(config.baseUrl).host}\n`);
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

  server.close();
  await knex.destroy();
  console.log(`\nĐã xuất ${routes.length} trang vào dist/ cho ${config.baseUrl}`);
  if (!config.orderEndpoint) console.warn('⚠  Chưa có ORDER_ENDPOINT trong .env — form đặt hàng sẽ báo khách gọi hotline thay vì gửi đơn.');
}

main().catch(async (err) => {
  console.error(err);
  await knex.destroy().catch(() => {});
  process.exit(1);
});
