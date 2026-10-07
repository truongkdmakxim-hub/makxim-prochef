const express = require('express');
const config = require('../config');
const catalog = require('../services/catalog');
const orders = require('../services/orders');
const blog = require('../services/blog');
const { knex } = require('../db');
const { faqs, pages } = require('../content');
const { PROVINCES } = require('../utils/format');

const router = express.Router();

// Static export: cart + checkout run in the browser (public/js/app.js) and these routes shadow the session-based ones.
if (config.staticMode) {
  router.get('/gio-hang', (req, res) => {
    res.render('pages/static-cart', { meta: { title: 'Giỏ hàng', robots: 'noindex' } });
  });
  router.get('/thanh-toan', (req, res) => {
    res.render('pages/static-checkout', { meta: { title: 'Đặt hàng', robots: 'noindex' }, provinces: PROVINCES });
  });
  router.get('/products.json', async (req, res) => {
    const products = await catalog.listProducts();
    res.json(products.map((p) => ({ id: p.id, slug: p.slug, name: p.name, line: p.lineLabel, price: p.price, image: p.image, stock: p.stock })));
  });
}

router.get('/', async (req, res) => {
  const [featured, singleRange, doubleRange, reviews, latestPosts] = await Promise.all([
    catalog.listProducts({ featured: true }),
    catalog.priceRange('don'),
    catalog.priceRange('doi'),
    knex('reviews').where({ is_active: true }).orderBy([{ column: 'sort_order' }, { column: 'id' }]),
    blog.listPublished({ limit: 3 }),
  ]);
  res.render('pages/home', {
    meta: {
      title: 'Makxim ProChef — Bếp điện từ đơn & đôi chính hãng',
      description: 'Bếp điện từ Makxim ProChef: bếp từ đơn, bếp từ đôi Inverter tiết kiệm điện, an toàn cho gia đình. Bảo hành đến 36 tháng, miễn phí giao hàng.',
    },
    featured,
    heroProduct: featured.find((p) => p.slug === 'prochef-d7-inverter') || featured[0],
    ranges: { don: singleRange, doi: doubleRange },
    faqs,
    reviews,
    latestPosts,
  });
});

const LINES = {
  'bep-tu-don': { line: 'don', title: 'Bếp từ đơn', lead: 'Nhỏ gọn, linh hoạt — cho căn hộ, bữa lẩu hay làm bếp phụ.' },
  'bep-tu-doi': { line: 'doi', title: 'Bếp từ đôi', lead: 'Hai vùng nấu cùng lúc cho bữa cơm gia đình trọn vẹn.' },
};

async function renderListing(req, res, lineInfo) {
  const sort = catalog.SORTS[req.query.sort] ? req.query.sort : 'featured';
  const products = await catalog.listProducts({ line: lineInfo?.line, sort });
  const title = lineInfo?.title || 'Tất cả bếp từ';
  res.render('pages/products', {
    meta: {
      title: `${title} ProChef — Giá tốt, bảo hành chính hãng`,
      description: lineInfo?.lead || 'Toàn bộ bếp điện từ đơn và đôi Makxim ProChef. Miễn phí giao hàng, bảo hành đến 36 tháng.',
      canonical: `${config.baseUrl}${req.path}`,
    },
    products,
    title,
    lead: lineInfo?.lead || 'Chọn chiếc bếp phù hợp với gian bếp và thói quen nấu nướng của bạn.',
    activeLine: lineInfo?.line || 'all',
    sort,
  });
}

router.get('/san-pham', (req, res) => renderListing(req, res, null));
router.get('/bep-tu-don', (req, res) => renderListing(req, res, LINES['bep-tu-don']));
router.get('/bep-tu-doi', (req, res) => renderListing(req, res, LINES['bep-tu-doi']));

router.get('/san-pham/:slug', async (req, res, next) => {
  const product = await catalog.getProductBySlug(req.params.slug);
  if (!product) return next();
  const related = await catalog.getRelated(product);
  res.render('pages/product', {
    meta: {
      title: `${product.name} — ${product.lineLabel} ${product.power_w}W | Makxim ProChef`,
      description: product.short_desc,
      canonical: `${config.baseUrl}/san-pham/${product.slug}`,
      type: 'product',
    },
    product,
    related,
  });
});

router.get('/so-sanh', async (req, res) => {
  const products = await catalog.listProducts();
  res.render('pages/compare', {
    meta: { title: 'So sánh bếp từ ProChef', description: 'Bảng so sánh thông số toàn bộ bếp điện từ đơn và đôi Makxim ProChef.' },
    products,
  });
});

router.get('/tra-cuu-don-hang', (req, res) => {
  res.render('pages/track', { meta: { title: 'Tra cứu đơn hàng' }, values: {}, error: null });
});

router.post('/tra-cuu-don-hang', async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  const phone = String(req.body.phone || '').replace(/[\s.-]/g, '');
  const order = code && phone ? await orders.findByCode(code) : null;
  if (!order || order.phone !== phone) {
    return res.status(404).render('pages/track', {
      meta: { title: 'Tra cứu đơn hàng' },
      values: { code, phone },
      error: 'Không tìm thấy đơn hàng khớp với mã và số điện thoại này.',
    });
  }
  res.redirect(`/don-hang/${order.code}?t=${order.access_token}`);
});

router.get('/lien-he', (req, res) => {
  res.render('pages/contact', { meta: { title: 'Liên hệ Makxim ProChef', description: 'Hotline, Zalo và địa chỉ showroom Makxim ProChef.' } });
});

router.get('/chinh-sach/:slug', (req, res, next) => {
  const page = pages[req.params.slug];
  if (!page) return next();
  res.render('pages/policy', { meta: { title: `${page.title} | Makxim ProChef`, description: page.lead }, page, slug: req.params.slug, pages });
});
router.get('/gioi-thieu', (req, res) => {
  const page = pages['gioi-thieu'];
  res.render('pages/policy', { meta: { title: page.title, description: page.lead }, page, slug: 'gioi-thieu', pages });
});

/* ---------- Tin tức ---------- */

const BLOG_TITLE = 'Tin tức & Mẹo bếp';
const BLOG_LEAD = 'Kinh nghiệm chọn bếp từ, mẹo nấu nướng, cách vệ sinh và bảo quản bếp để dùng bền, tiết kiệm điện.';

async function renderBlog(req, res, next, page) {
  const total = await blog.countPublished();
  if (!total) return next();
  const pageCount = Math.max(1, Math.ceil(total / blog.PAGE_SIZE));
  if (page > pageCount) return next();
  const posts = await blog.listPublished({ page });
  const path = page === 1 ? '/tin-tuc' : `/tin-tuc/trang/${page}`;
  res.render('pages/blog', {
    meta: {
      title: page === 1 ? `${BLOG_TITLE} | Makxim ProChef` : `${BLOG_TITLE} — Trang ${page} | Makxim ProChef`,
      description: BLOG_LEAD,
      canonical: `${config.baseUrl}${path}`,
    },
    currentPath: '/tin-tuc',
    title: BLOG_TITLE,
    lead: BLOG_LEAD,
    posts,
    page,
    pageCount,
  });
}

router.get('/tin-tuc', (req, res, next) => renderBlog(req, res, next, 1));
router.get('/tin-tuc/trang/:page', (req, res, next) => {
  const page = parseInt(req.params.page, 10);
  if (!(page >= 2)) return next();
  return renderBlog(req, res, next, page);
});

router.get('/tin-tuc/:slug', async (req, res, next) => {
  const post = await blog.getPublishedBySlug(req.params.slug);
  if (!post) return next();
  const [related, products] = await Promise.all([blog.getRelatedPosts(post), blog.getPostProducts(post)]);
  const url = `${config.baseUrl}/tin-tuc/${post.slug}`;
  const image = post.cover_image ? (post.cover_image.startsWith('http') ? post.cover_image : config.baseUrl + post.cover_image) : null;
  res.render('pages/post', {
    meta: {
      title: post.meta_title || `${post.title} | Makxim ProChef`,
      description: post.meta_description || post.excerpt,
      canonical: url,
      type: 'article',
      image,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: (post.updatedAt || post.publishedAt)?.toISOString(),
    },
    currentPath: '/tin-tuc',
    post,
    body: blog.renderContent(post.content),
    related,
    products,
    articleUrl: url,
    articleImage: image,
  });
});

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nDisallow: /gio-hang\nDisallow: /thanh-toan\nDisallow: /don-hang\nSitemap: ${config.baseUrl}/sitemap.xml\n`);
});

router.get('/sitemap.xml', async (req, res) => {
  const products = await knex('products').where({ is_active: true }).select('slug', 'updated_at');
  const posts = (await knex('posts').where({ is_published: true }).select('slug', 'published_at', 'updated_at')).map(blog.hydratePost);
  const pageCount = Math.ceil(posts.length / blog.PAGE_SIZE);
  const staticPaths = ['/', '/san-pham', '/bep-tu-don', '/bep-tu-doi', '/so-sanh', ...(posts.length ? ['/tin-tuc'] : []), '/lien-he', '/gioi-thieu', ...Object.keys(pages).filter((s) => s !== 'gioi-thieu').map((s) => `/chinh-sach/${s}`)];
  for (let i = 2; i <= pageCount; i += 1) staticPaths.push(`/tin-tuc/trang/${i}`);
  const lastmod = (d) => (d ? `<lastmod>${d.toISOString().slice(0, 10)}</lastmod>` : '');
  const urls = [
    ...staticPaths.map((p) => `<url><loc>${config.baseUrl}${p}</loc></url>`),
    ...products.map((p) => `<url><loc>${config.baseUrl}/san-pham/${p.slug}</loc></url>`),
    ...posts.map((p) => `<url><loc>${config.baseUrl}/tin-tuc/${p.slug}</loc>${lastmod(p.updatedAt || p.publishedAt)}</url>`),
  ];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
});

module.exports = router;
