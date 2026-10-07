const { knex, parseJson } = require('../db');
const catalog = require('./catalog');
const { slugify, toDate } = require('../utils/format');

const PAGE_SIZE = 9;

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeUrl = (u) => (/^(https?:\/\/|\/(?!\/))/.test(u) ? u : null);

/** **đậm**, *nghiêng*, [chữ](link) on already-escaped text. */
function inline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => {
      const url = safeUrl(href.replace(/&amp;/g, '&'));
      if (!url) return label;
      const external = /^https?:\/\//.test(url);
      return `<a href="${escapeHtml(url)}"${external ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
    });
}

/**
 * Renders the simple writing format used in Admin → Tin tức into safe HTML.
 * Blocks are separated by a blank line: "## Tiêu đề", "### Tiêu đề nhỏ", "- danh sách", "1. danh sách số",
 * "> trích dẫn", "![mô tả](link ảnh)" or a plain paragraph. Raw HTML is always escaped.
 */
function renderContent(source) {
  const toc = [];
  const blocks = String(source || '').replace(/\r\n/g, '\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const html = blocks.map((block) => {
    const lines = block.split('\n').map((l) => l.trim());
    const heading = block.match(/^(#{2,3})\s+(.+)$/);
    if (heading && lines.length === 1) {
      const text = escapeHtml(heading[2]);
      if (heading[1] === '##') {
        const id = slugify(heading[2]) || `muc-${toc.length + 1}`;
        toc.push({ id, text: heading[2] });
        return `<h2 id="${id}">${inline(text)}</h2>`;
      }
      return `<h3>${inline(text)}</h3>`;
    }
    const image = block.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (image && safeUrl(image[2])) {
      const alt = escapeHtml(image[1]);
      return `<figure><img src="${escapeHtml(image[2])}" alt="${alt}" loading="lazy" decoding="async">${alt ? `<figcaption>${alt}</figcaption>` : ''}</figure>`;
    }
    if (lines.every((l) => /^[-*]\s+/.test(l))) {
      return `<ul>${lines.map((l) => `<li>${inline(escapeHtml(l.replace(/^[-*]\s+/, '')))}</li>`).join('')}</ul>`;
    }
    if (lines.every((l) => /^\d+[.)]\s+/.test(l))) {
      return `<ol>${lines.map((l) => `<li>${inline(escapeHtml(l.replace(/^\d+[.)]\s+/, '')))}</li>`).join('')}</ol>`;
    }
    if (lines.every((l) => l.startsWith('>'))) {
      return `<blockquote><p>${lines.map((l) => inline(escapeHtml(l.replace(/^>\s?/, '')))).join('<br>')}</p></blockquote>`;
    }
    return `<p>${lines.map((l) => inline(escapeHtml(l))).join('<br>')}</p>`;
  }).join('\n');

  const words = String(source || '').split(/\s+/).filter(Boolean).length;
  return { html, toc, readMinutes: Math.max(1, Math.round(words / 220)) };
}

function hydratePost(row) {
  if (!row) return null;
  return {
    ...row,
    is_published: Boolean(row.is_published),
    product_ids: parseJson(row.product_ids, []).map(Number).filter(Boolean),
    publishedAt: toDate(row.published_at),
    updatedAt: toDate(row.updated_at),
  };
}

const published = () => knex('posts').where({ is_published: true });

async function countPublished() {
  const [{ count }] = await published().count({ count: '*' });
  return Number(count);
}

async function listPublished({ page = 1, limit = PAGE_SIZE } = {}) {
  const rows = await published().orderBy([{ column: 'published_at', order: 'desc' }, { column: 'id', order: 'desc' }]).limit(limit).offset((page - 1) * limit);
  return rows.map(hydratePost);
}

async function getPublishedBySlug(slug) {
  return hydratePost(await published().where({ slug }).first());
}

async function getRelatedPosts(post, limit = 3) {
  const rows = await published().whereNot({ id: post.id }).orderBy('published_at', 'desc').limit(limit);
  return rows.map(hydratePost);
}

async function getPostProducts(post) {
  if (!post.product_ids.length) return [];
  const products = await catalog.listProducts();
  return post.product_ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
}

module.exports = { PAGE_SIZE, renderContent, hydratePost, countPublished, listPublished, getPublishedBySlug, getRelatedPosts, getPostProducts };
