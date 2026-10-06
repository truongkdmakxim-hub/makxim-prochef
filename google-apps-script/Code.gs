/**
 * Nhận đơn hàng từ website prochef.makxim.vn (bản tĩnh) và ghi vào Google Sheet.
 *
 * Cách dùng: mở Google Sheet → Tiện ích mở rộng → Apps Script → dán toàn bộ file này
 * → chạy hàm setup() một lần → Triển khai (Deploy) dạng Ứng dụng web.
 * Xem hướng dẫn chi tiết trong HUONG-DAN.md.
 */

const SHEET_NAME = 'Đơn hàng ProChef';

// Email nhận thông báo khi có đơn mới. Để trống '' nếu không cần.
const NOTIFY_EMAIL = 'kinhdoanh@makxim.vn';

const HEADERS = [
  'Thời gian', 'Mã đơn', 'Họ và tên', 'Số điện thoại', 'Email', 'Tỉnh / Thành phố',
  'Phường / Xã', 'Địa chỉ', 'Sản phẩm', 'Tạm tính', 'Phí vận chuyển', 'Tổng cộng',
  'Ghi chú', 'Trang gửi', 'UTM Source', 'UTM Campaign', 'Trạng thái'
];

/** Chạy một lần để tạo trang tính và dòng tiêu đề. */
function setup() {
  const sheet = getSheet_();
  SpreadsheetApp.getActive().setActiveSheet(sheet);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = (e && e.parameter) || {};

    // Bẫy spam: trường ẩn "website" phải để trống
    if (p.website) return json_({ ok: true });

    const name = clean_(p.name, 100);
    const phone = clean_(p.phone, 20).replace(/[\s.-]/g, '');
    if (!name || !/^0\d{9,10}$/.test(phone) || !p.items) {
      return json_({ ok: false, error: 'invalid' });
    }

    const row = [
      new Date(), clean_(p.code, 30), name, "'" + phone, clean_(p.email, 120),
      clean_(p.province, 60), clean_(p.ward, 100), clean_(p.address, 200),
      clean_(p.items, 2000), num_(p.subtotal), num_(p.shipping), num_(p.total),
      clean_(p.note, 500), clean_(p.page, 300), clean_(p.utm_source, 100),
      clean_(p.utm_campaign, 100), 'Mới'
    ];
    getSheet_().appendRow(row);

    if (NOTIFY_EMAIL) {
      const money = (n) => Number(n).toLocaleString('vi-VN') + 'đ';
      MailApp.sendEmail(
        NOTIFY_EMAIL,
        '[ProChef] Đơn mới ' + row[1] + ': ' + name + ' – ' + phone + ' – ' + money(row[11]),
        [
          'Mã đơn: ' + row[1],
          'Khách: ' + name + ' – ' + phone + (row[4] ? ' – ' + row[4] : ''),
          'Địa chỉ: ' + [row[7], row[6], row[5]].filter(String).join(', '),
          '',
          'Sản phẩm:',
          row[8],
          '',
          'Tạm tính: ' + money(row[9]),
          'Phí vận chuyển: ' + money(row[10]),
          'Tổng cộng: ' + money(row[11]),
          row[12] ? '\nGhi chú: ' + row[12] : ''
        ].join('\n')
      );
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, message: 'ProChef order endpoint đang hoạt động' });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold').setBackground('#c2410c').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm:ss');
    sheet.getRange('J:L').setNumberFormat('#,##0');
    sheet.getRange('I:I').setWrap(true);
    sheet.setColumnWidths(1, HEADERS.length, 140);
    sheet.setColumnWidth(9, 320);
  }
  return sheet;
}

// Cắt độ dài và chặn công thức (=, +, -, @) để tránh chèn công thức vào Sheet
function clean_(v, max) {
  let s = String(v || '').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function num_(v) {
  const n = parseInt(String(v || '0').replace(/\D/g, ''), 10);
  return isFinite(n) ? n : 0;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
