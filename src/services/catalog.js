const { knex, hydrateProduct } = require('../db');

const SORTS = {
  featured: [['sort_order', 'asc']],
  'price-asc': [['price', 'asc']],
  'price-desc': [['price', 'desc']],
  newest: [['created_at', 'desc'], ['id', 'desc']],
};

async function listProducts({ line, sort = 'featured', featured, limit } = {}) {
  const query = knex('products').where({ is_active: true });
  if (line === 'don' || line === 'doi') query.andWhere({ line });
  if (featured) query.andWhere({ is_featured: true });
  for (const [column, dir] of SORTS[sort] || SORTS.featured) query.orderBy(column, dir);
  if (limit) query.limit(limit);
  return (await query).map(hydrateProduct);
}

async function getProductBySlug(slug) {
  const row = await knex('products').where({ slug, is_active: true }).first();
  return hydrateProduct(row);
}

async function getRelated(product, limit = 3) {
  const rows = await knex('products')
    .where({ is_active: true, line: product.line })
    .whereNot({ id: product.id })
    .orderBy('sort_order')
    .limit(limit);
  return rows.map(hydrateProduct);
}

async function priceRange(line) {
  const row = await knex('products').where({ is_active: true, line }).min({ min: 'price' }).max({ max: 'price' }).first();
  return { min: Number(row?.min) || 0, max: Number(row?.max) || 0 };
}

module.exports = { listProducts, getProductBySlug, getRelated, priceRange, SORTS };
