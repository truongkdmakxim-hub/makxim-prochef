// Generates stylised top-view SVG renders for the sample catalogue.
// Replace with real product photography via Admin > Sản phẩm when available.
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'img', 'products');
fs.mkdirSync(OUT, { recursive: true });

const FONT = "font-family=\"'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif\"";

function defs(id) {
  return `<defs>
  <linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#2b2b30"/><stop offset=".45" stop-color="#141417"/><stop offset="1" stop-color="#060607"/>
  </linearGradient>
  <linearGradient id="${id}-shine" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="${id}-steel" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#f5f5f4"/><stop offset=".5" stop-color="#a8a29e"/><stop offset="1" stop-color="#e7e5e4"/>
  </linearGradient>
  <radialGradient id="${id}-pan" cx=".42" cy=".38" r=".75">
    <stop offset="0" stop-color="#fafaf9"/><stop offset=".55" stop-color="#d6d3d1"/><stop offset="1" stop-color="#78716c"/>
  </radialGradient>
  <radialGradient id="${id}-glow" cx=".5" cy=".5" r=".5">
    <stop offset=".72" stop-color="#ff6a1a" stop-opacity="0"/><stop offset=".86" stop-color="#ff6a1a" stop-opacity=".85"/><stop offset="1" stop-color="#ff3d00" stop-opacity="0"/>
  </radialGradient>
  <filter id="${id}-shadow" x="-20%" y="-20%" width="140%" height="150%">
    <feDropShadow dx="0" dy="28" stdDeviation="26" flood-color="#1c1917" flood-opacity=".28"/>
  </filter>
  <filter id="${id}-blur"><feGaussianBlur stdDeviation="6"/></filter>
</defs>`;
}

function zone(id, cx, cy, r, { active, pan }) {
  const rings = `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 12}" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="1.5"/>
  ${[0, 90, 180, 270]
    .map((a) => {
      const rad = (a * Math.PI) / 180;
      const x1 = cx + Math.cos(rad) * (r + 8);
      const y1 = cy + Math.sin(rad) * (r + 8);
      const x2 = cx + Math.cos(rad) * (r + 20);
      const y2 = cy + Math.sin(rad) * (r + 20);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#fff" stroke-opacity=".28" stroke-width="2" stroke-linecap="round"/>`;
    })
    .join('')}`;
  const glow = active
    ? `<circle cx="${cx}" cy="${cy}" r="${r + 18}" fill="url(#${id}-glow)" filter="url(#${id}-blur)"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 4}" fill="none" stroke="#ff7a2e" stroke-opacity=".55" stroke-width="3"/>`
    : '';
  const panSvg = pan
    ? `<g filter="url(#${id}-shadow)">
    <rect x="${cx + r * 0.72}" y="${cy - 13}" width="${r * 1.05}" height="26" rx="13" fill="#292524"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.82}" fill="url(#${id}-pan)"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.74}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="#44403c" fill-opacity=".08"/>
  </g>`
    : '';
  return rings + glow + panSvg;
}

function controls(x, y, w, { slider, display, label }) {
  const cy = y;
  const parts = [];
  // Power button
  parts.push(`<g stroke="#e7e5e4" stroke-opacity=".75" stroke-width="2.4" fill="none" stroke-linecap="round">
    <path d="M${x + 14} ${cy - 9} a12 12 0 1 0 12 0"/><line x1="${x + 20}" y1="${cy - 14}" x2="${x + 20}" y2="${cy - 1}"/></g>`);
  if (slider) {
    const sx = x + 60;
    const sw = w - 200;
    parts.push(`<line x1="${sx}" y1="${cy}" x2="${sx + sw}" y2="${cy}" stroke="#fff" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/>`);
    for (let i = 0; i <= 9; i++) {
      const px = sx + (sw / 9) * i;
      parts.push(`<circle cx="${px.toFixed(1)}" cy="${cy}" r="${i < 6 ? 3.2 : 2.4}" fill="${i < 6 ? '#ff7a2e' : '#fff'}" fill-opacity="${i < 6 ? 1 : 0.35}"/>`);
    }
  } else {
    const bx = x + 70;
    parts.push(`<g stroke="#e7e5e4" stroke-opacity=".75" stroke-width="2.4" stroke-linecap="round">
      <line x1="${bx}" y1="${cy}" x2="${bx + 18}" y2="${cy}"/>
      <line x1="${bx + 60}" y1="${cy}" x2="${bx + 78}" y2="${cy}"/><line x1="${bx + 69}" y1="${cy - 9}" x2="${bx + 69}" y2="${cy + 9}"/>
    </g>
    <g fill="none" stroke="#e7e5e4" stroke-opacity=".75" stroke-width="2.2">
      <circle cx="${bx + 130}" cy="${cy}" r="10"/><path d="M${bx + 130} ${cy - 5} v5 l4 3" stroke-linecap="round"/>
    </g>`);
  }
  if (display) {
    parts.push(`<text x="${x + w - 48}" y="${cy + 9}" text-anchor="end" font-family="'Courier New', monospace" font-weight="700" font-size="26" fill="#ff3b1f" letter-spacing="2">${display}</text>`);
  }
  // Child lock
  parts.push(`<g fill="none" stroke="#e7e5e4" stroke-opacity=".6" stroke-width="2.2" stroke-linejoin="round">
    <rect x="${x + w - 26}" y="${cy - 3}" width="18" height="14" rx="3"/><path d="M${x + w - 22} ${cy - 3} v-4 a5 5 0 0 1 10 0 v4"/></g>`);
  if (label) {
    parts.push(`<text x="${x + w / 2}" y="${cy + 44}" text-anchor="middle" ${FONT} font-size="13" font-weight="600" letter-spacing="4" fill="#fff" fill-opacity=".42">${label}</text>`);
  }
  return parts.join('\n');
}

function single(id, opts, state) {
  const x = 210, y = 110, w = 380, h = 540;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${opts.name}">
${defs(id)}
<ellipse cx="400" cy="690" rx="230" ry="26" fill="#1c1917" opacity=".12"/>
<g filter="url(#${id}-shadow)">
  ${opts.frame ? `<rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" rx="34" fill="url(#${id}-steel)"/>` : ''}
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${opts.frame ? 26 : 30}" fill="url(#${id}-glass)"/>
</g>
${zone(id, 400, 305, 142, state)}
<line x1="${x + 34}" y1="${y + 420}" x2="${x + w - 34}" y2="${y + 420}" stroke="#fff" stroke-opacity=".08"/>
${controls(x + 34, y + 470, w - 68, opts)}
<text x="400" y="${y + 36}" text-anchor="middle" ${FONT} font-size="15" font-weight="700" letter-spacing="3" fill="#fff" fill-opacity=".5">PROCHEF</text>
<path d="M${x} ${y + 30} q0 -30 30 -30 h${w * 0.55} l-${w * 0.55 + 30} ${h * 0.62} z" fill="url(#${id}-shine)"/>
</svg>`;
}

function double(id, opts, state) {
  const x = 60, y = 190, w = 680, h = 420;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${opts.name}">
${defs(id)}
<ellipse cx="400" cy="655" rx="330" ry="26" fill="#1c1917" opacity=".12"/>
<g filter="url(#${id}-shadow)">
  ${opts.frame ? `<rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" rx="22" fill="url(#${id}-steel)"/>` : ''}
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${opts.frame ? 14 : 20}" fill="url(#${id}-glass)"/>
  ${opts.frame ? `<rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" rx="10" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>` : ''}
</g>
${zone(id, 235, 350, opts.bigZone || 118, { active: state.active, pan: state.pan })}
${zone(id, 565, 350, 108, { active: state.active && state.both, pan: false })}
${controls(x + 170, y + 355, w - 340, opts)}
<path d="M${x} ${y + 20} q0 -20 20 -20 h${w * 0.42} l-${w * 0.42 + 20} ${h * 0.9} z" fill="url(#${id}-shine)"/>
</svg>`;
}

const catalogue = [
  { slug: 'prochef-s1-compact', type: single, name: 'ProChef S1 Compact', display: '2000', label: 'COMPACT' },
  { slug: 'prochef-s2-slim', type: single, name: 'ProChef S2 Slim', slider: true, label: 'SLIM' },
  { slug: 'prochef-s3-inverter', type: single, name: 'ProChef S3 Inverter', slider: true, display: 'P9', frame: true, label: 'INVERTER' },
  { slug: 'prochef-d5-duo', type: double, name: 'ProChef D5 Duo', display: '8', label: 'PROCHEF DUO' },
  { slug: 'prochef-d7-inverter', type: double, name: 'ProChef D7 Inverter', slider: true, display: 'b', label: 'PROCHEF INVERTER' },
  { slug: 'prochef-d9-signature', type: double, name: 'ProChef D9 Signature', slider: true, display: 'P15', frame: true, bigZone: 128, label: 'SIGNATURE' },
];

for (const item of catalogue) {
  const id = item.slug.replace(/[^a-z0-9]/g, '');
  fs.writeFileSync(path.join(OUT, `${item.slug}-1.svg`), item.type(`${id}a`, item, { active: false }));
  fs.writeFileSync(path.join(OUT, `${item.slug}-2.svg`), item.type(`${id}b`, item, { active: true, pan: true, both: true }));
}

fs.writeFileSync(
  path.join(OUT, 'placeholder.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><rect width="800" height="800" fill="#f5f5f4"/><rect x="250" y="250" width="300" height="300" rx="28" fill="none" stroke="#d6d3d1" stroke-width="6"/><circle cx="400" cy="400" r="90" fill="none" stroke="#d6d3d1" stroke-width="6"/></svg>`,
);

console.log(`Generated ${catalogue.length * 2 + 1} images in ${OUT}`);
