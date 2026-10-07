const moneyFormatter = new Intl.NumberFormat('vi-VN');
const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Asia/Ho_Chi_Minh',
});

function money(value) {
  return `${moneyFormatter.format(Math.round(Number(value) || 0))}₫`;
}

const longDateFormatter = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });

/** DB timestamp (Date, epoch ms or "YYYY-MM-DD HH:MM:SS" in UTC) → Date, or null. */
function toDate(value) {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value
    : typeof value === 'number' ? new Date(value)
    : new Date(String(value).replace(' ', 'T') + (/[zZ+]|T.*-\d\d:?\d\d$/.test(String(value)) ? '' : 'Z'));
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateTime(value) {
  if (!value) return '';
  const d = toDate(value);
  return d ? dateFormatter.format(d) : String(value);
}

function date(value) {
  const d = toDate(value);
  return d ? longDateFormatter.format(d) : '';
}

/** Date → "YYYY-MM-DD HH:MM:SS" (UTC), the same shape knex.fn.now() stores. */
function sqlTimestamp(d = new Date()) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
}

/** Splits stored plain-text descriptions into paragraphs. */
function paragraphs(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const ORDER_STATUS = {
  new: { label: 'Mới', tone: 'info' },
  confirmed: { label: 'Đã xác nhận', tone: 'accent' },
  shipping: { label: 'Đang giao', tone: 'warning' },
  completed: { label: 'Hoàn tất', tone: 'success' },
  cancelled: { label: 'Đã hủy', tone: 'danger' },
};

const PAYMENT_STATUS = {
  pending: { label: 'Chờ thanh toán', tone: 'warning' },
  paid: { label: 'Đã thanh toán', tone: 'success' },
  failed: { label: 'Thanh toán lỗi', tone: 'danger' },
  refunded: { label: 'Đã hoàn tiền', tone: 'neutral' },
};

const PAYMENT_METHOD = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  momo: 'Ví MoMo',
};

// 34 tỉnh/thành sau sắp xếp đơn vị hành chính (01/07/2025).
const PROVINCES = [
  'Hà Nội', 'TP. Hồ Chí Minh', 'Hải Phòng', 'Đà Nẵng', 'Cần Thơ', 'Huế',
  'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Điện Biên', 'Đồng Nai',
  'Đồng Tháp', 'Gia Lai', 'Hà Tĩnh', 'Hưng Yên', 'Khánh Hòa', 'Lai Châu', 'Lâm Đồng',
  'Lạng Sơn', 'Lào Cai', 'Nghệ An', 'Ninh Bình', 'Phú Thọ', 'Quảng Ngãi', 'Quảng Ninh',
  'Quảng Trị', 'Sơn La', 'Tây Ninh', 'Thái Nguyên', 'Thanh Hóa', 'Tuyên Quang', 'Vĩnh Long',
];

module.exports = { money, dateTime, date, toDate, sqlTimestamp, slugify, paragraphs, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD, PROVINCES };
