// MoMo Payment Gateway v2 (captureWallet / payWithMethod).
// Docs: https://developers.momo.vn/v3/docs/payment/api/wallet/onetime
const crypto = require('crypto');
const config = require('../config');

const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 50000000;

function sign(raw) {
  return crypto.createHmac('sha256', config.momo.secretKey).update(raw).digest('hex');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function isAmountSupported(amount) {
  return amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;
}

/** Creates a payment request and returns { payUrl, momoOrderId }. */
async function createPayment({ orderCode, amount, orderInfo }) {
  const { partnerCode, accessKey, endpoint, requestType } = config.momo;
  // MoMo requires a unique orderId per request, so retries get a fresh suffix.
  const momoOrderId = `${orderCode}-${Date.now().toString(36)}`;
  const requestId = momoOrderId;
  const redirectUrl = `${config.baseUrl}/thanh-toan/momo/ket-qua`;
  const ipnUrl = `${config.baseUrl}/api/momo/ipn`;
  const extraData = Buffer.from(JSON.stringify({ code: orderCode })).toString('base64');

  const raw =
    `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}` +
    `&orderId=${momoOrderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}` +
    `&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

  const body = {
    partnerCode,
    partnerName: config.shop.name,
    storeId: partnerCode,
    requestId,
    amount,
    orderId: momoOrderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    lang: 'vi',
    requestType,
    autoCapture: true,
    extraData,
    signature: sign(raw),
  };

  const res = await fetch(`${endpoint}/v2/gateway/api/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  if (data.resultCode !== 0 || !data.payUrl) {
    const err = new Error(data.message || `MoMo create payment failed (HTTP ${res.status})`);
    err.momo = data;
    throw err;
  }
  return { payUrl: data.payUrl, momoOrderId };
}

/** Verifies the signature on an IPN body or redirect query string. */
function verifyResult(p) {
  const { accessKey, partnerCode } = config.momo;
  if (p.partnerCode !== partnerCode) return false;
  const raw =
    `accessKey=${accessKey}&amount=${p.amount}&extraData=${p.extraData ?? ''}&message=${p.message}` +
    `&orderId=${p.orderId}&orderInfo=${p.orderInfo}&orderType=${p.orderType}&partnerCode=${p.partnerCode}` +
    `&payType=${p.payType}&requestId=${p.requestId}&responseTime=${p.responseTime}` +
    `&resultCode=${p.resultCode}&transId=${p.transId}`;
  return safeEqual(sign(raw), p.signature);
}

module.exports = { createPayment, verifyResult, isAmountSupported, MIN_AMOUNT, MAX_AMOUNT };
