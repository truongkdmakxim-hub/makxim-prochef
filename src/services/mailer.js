const nodemailer = require('nodemailer');
const config = require('../config');
const { money, PAYMENT_METHOD } = require('../utils/format');

let transporter = null;
function getTransporter() {
  if (!config.smtp.enabled) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.password },
    });
  }
  return transporter;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function orderHtml(order, items, heading) {
  const rows = items
    .map((i) => `<tr><td style="padding:8px 0">${esc(i.name)} × ${i.qty}</td><td style="padding:8px 0;text-align:right">${money(i.line_total)}</td></tr>`)
    .join('');
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1c1917">
  <h2 style="margin:0 0 4px">${esc(heading)}</h2>
  <p style="color:#57534e;margin:0 0 16px">Mã đơn <b>${esc(order.code)}</b> · ${esc(PAYMENT_METHOD[order.payment_method])}</p>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #e7e5e4">${rows}
  <tr><td style="padding:8px 0;border-top:1px solid #e7e5e4">Tạm tính</td><td style="text-align:right;border-top:1px solid #e7e5e4">${money(order.subtotal)}</td></tr>
  ${order.discount ? `<tr><td>Giảm giá</td><td style="text-align:right">−${money(order.discount)}</td></tr>` : ''}
  <tr><td>Phí vận chuyển</td><td style="text-align:right">${order.shipping_fee ? money(order.shipping_fee) : 'Miễn phí'}</td></tr>
  <tr><td style="padding-top:8px"><b>Tổng cộng</b></td><td style="text-align:right;padding-top:8px"><b>${money(order.total)}</b></td></tr></table>
  <p style="margin-top:20px"><b>Giao đến:</b> ${esc(order.customer_name)} · ${esc(order.phone)}<br>${esc(order.address)}, ${esc(order.ward)}, ${esc(order.province)}</p>
  ${order.note ? `<p><b>Ghi chú:</b> ${esc(order.note)}</p>` : ''}
  <p style="color:#57534e;font-size:13px">${esc(config.shop.name)} · Hotline ${esc(config.shop.hotline)}</p></div>`;
}

async function sendOrderEmails(order, items) {
  const t = getTransporter();
  if (!t) {
    console.log(`[mail] SMTP not configured — skipped emails for order ${order.code}.`);
    return;
  }
  const jobs = [
    t.sendMail({
      from: config.smtp.from,
      to: config.shop.email,
      subject: `[Đơn mới] ${order.code} — ${money(order.total)}`,
      html: orderHtml(order, items, 'Có đơn hàng mới'),
    }),
  ];
  if (order.email) {
    jobs.push(
      t.sendMail({
        from: config.smtp.from,
        to: order.email,
        subject: `Makxim ProChef đã nhận đơn ${order.code}`,
        html: orderHtml(order, items, `Cảm ơn ${order.customer_name}, chúng tôi đã nhận đơn hàng!`),
      }),
    );
  }
  const results = await Promise.allSettled(jobs);
  for (const r of results) if (r.status === 'rejected') console.error('[mail] send failed:', r.reason?.message);
}

module.exports = { sendOrderEmails };
