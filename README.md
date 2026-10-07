# Makxim ProChef — Website TMĐT bếp điện từ

Website bán bếp điện từ đơn & đôi: catalog, giỏ hàng, mã giảm giá, thanh toán **COD** và **ví MoMo**, tra cứu đơn, trang quản trị (đơn hàng, sản phẩm, tồn kho, mã giảm giá), email thông báo đơn, SEO (sitemap, JSON-LD Product), nút chat Zalo/Messenger.

**Stack:** Node.js ≥ 20 · Express 5 · EJS (render server, tốt cho SEO) · Knex (MySQL khi chạy thật, SQLite khi dev) · CSS/JS thuần — không cần bước build.

---

## 1. Chạy trên máy (local)

```bash
npm install
cp .env.example .env        # sửa: NODE_ENV=development, bỏ trống DB_HOST để dùng SQLite
npm run dev                 # http://localhost:3000
```

Lần chạy đầu tự tạo bảng, nạp 6 sản phẩm mẫu và 2 mã giảm giá (`PROCHEF10`, `CHAOBAN200`).
Nếu `ADMIN_PASSWORD` trống, mật khẩu admin tạm được in ra console **một lần**. Đổi mật khẩu bất kỳ lúc nào:

```bash
npm run hash-password -- admin@makxim.vn "MatKhauMoi_ItNhat10KyTu"
```

Admin: `http://localhost:3000/admin`

## 2. Đẩy lên GitHub

```bash
git remote add origin https://github.com/<tai-khoan>/makxim-prochef.git
git push -u origin main
```

`.env`, `data/` (SQLite) và `public/uploads/` đã được loại khỏi Git.

## 3. Deploy lên Hostinger (gói Business / Cloud — Node.js Web App)

> Tên các nút trong hPanel có thể khác đôi chút tùy phiên bản giao diện.

1. **Tạo MySQL**: hPanel → *Databases* → *MySQL Databases* → tạo database + user. Ghi lại tên DB, user, mật khẩu (host thường là `localhost`).
2. **Tạo Node.js app**: hPanel → *Websites* → *Add website* → *Node.js Apps* → *Import Git repository* → kết nối GitHub và chọn repo `makxim-prochef`, nhánh `main`.
3. **Cấu hình build**:
   - Node.js version: **20** hoặc **22**
   - Entry file: `server.js` · Build command: `npm install` · Start command: `npm start`
4. **Environment variables** — nhập theo `.env.example`, tối thiểu:

   | Biến | Giá trị |
   |---|---|
   | `NODE_ENV` | `production` |
   | `BASE_URL` | `https://ten-mien-cua-ban.vn` |
   | `SESSION_SECRET` | chuỗi ngẫu nhiên ≥ 32 ký tự |
   | `DB_CLIENT` / `DB_HOST` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `mysql2` / `localhost` / … |
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD` | tài khoản admin đầu tiên |
   | `SHOP_HOTLINE`, `ZALO_URL`, `MESSENGER_URL` | thông tin thật |

   Tạo `SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
5. **Deploy**. App tự chạy migration và nạp dữ liệu mẫu ở lần khởi động đầu. Kiểm tra `https://<domain>/healthz` trả về `{"ok":true}`.
6. **Tên miền & SSL**: trỏ domain vào app trong hPanel, bật SSL miễn phí. Cập nhật `BASE_URL` cho khớp.
7. **Cập nhật về sau**: `git push` → bấm *Redeploy* (hoặc bật auto-deploy nếu hPanel hỗ trợ).

**Ảnh upload từ Admin**: mặc định lưu ở `public/uploads/`, có thể bị xóa khi redeploy. Nên đặt `UPLOAD_DIR` ra thư mục ngoài mã nguồn (VD `/home/uXXXX/prochef-uploads`), hoặc dán URL ảnh từ CDN trong form sản phẩm.

## 4. Kích hoạt thanh toán MoMo

1. Đăng ký tài khoản doanh nghiệp tại [business.momo.vn](https://business.momo.vn) → lấy `Partner Code`, `Access Key`, `Secret Key`.
2. Test trước với môi trường sandbox (`MOMO_ENDPOINT=https://test-payment.momo.vn`) và thông tin test trong [tài liệu MoMo](https://developers.momo.vn).
3. Khi chạy thật: `MOMO_ENDPOINT=https://payment.momo.vn` + key production.
4. `BASE_URL` phải là HTTPS công khai — MoMo gọi IPN về `BASE_URL/api/momo/ipn` và chuyển khách về `BASE_URL/thanh-toan/momo/ket-qua`.

Nếu chưa nhập key MoMo, lựa chọn MoMo hiển thị “Sắp ra mắt” và không chọn được.

## 5. Email thông báo đơn hàng

Điền `SMTP_*` (Hostinger Email: `smtp.hostinger.com`, cổng `465`). Mỗi đơn mới gửi email cho `SHOP_EMAIL` và cho khách (nếu khách nhập email).

## 6. Tin tức (blog SEO)

Viết bài tại **Admin → Tin tức** (http://localhost:3000/admin/tin-tuc): tiêu đề, đường dẫn, tóm tắt, ảnh đại diện, nội dung, tiêu đề/mô tả SEO và sản phẩm liên quan. Tích **Đăng công khai** rồi chạy `npm run deploy:static` để bài lên `prochef.makxim.vn/tin-tuc`.

- Định dạng nội dung: cách đoạn bằng dòng trống, `## Tiêu đề mục`, `- danh sách`, `**đậm**`, `[chữ](/san-pham/...)`, `![mô tả](/uploads/anh.jpg)` — hướng dẫn ngay dưới ô nội dung.
- Mỗi bài tự có canonical, Open Graph (ảnh khi chia sẻ Facebook/Zalo), schema `BlogPosting` + breadcrumb, mục lục, và được thêm vào `sitemap.xml`.
- Mục "Tin tức" trên menu, chân trang và trang chủ chỉ hiện khi có ít nhất một bài đã đăng. Có sẵn một bài nháp mẫu để tham khảo.

## 7. Cần thay trước khi ra mắt

- [ ] **Ảnh sản phẩm**: ảnh SVG hiện tại là ảnh minh họa tự tạo → thay bằng ảnh chụp thật (Admin → Sản phẩm).
- [ ] **Giá, thông số, bảo hành** trong 6 sản phẩm mẫu.
- [ ] **Số liệu & đánh giá trên trang chủ** (“2.000+ gia đình”, “4,9/5”, 3 đánh giá khách hàng) là **nội dung mẫu** — thay bằng số liệu/đánh giá thật hoặc xóa, tránh vi phạm quy định quảng cáo. Sửa tại `src/views/pages/home.ejs` và `src/content.js`.
- [ ] Chính sách bảo hành / đổi trả / vận chuyển (`src/content.js`).
- [ ] Hotline, địa chỉ, Zalo, Messenger, tên pháp nhân (biến môi trường `SHOP_*`).
- [ ] Mã giảm giá mẫu `PROCHEF10`, `CHAOBAN200` — xóa hoặc chỉnh trong Admin.

## Cấu trúc

```
server.js                 khởi động: migrate → seed → listen
src/app.js                Express, Helmet CSP, session, routes
src/config.js             đọc biến môi trường
src/db/                   Knex, migration, dữ liệu mẫu
src/services/             cart, orders, momo, mailer, catalog
src/routes/               shop, cart, checkout (+ MoMo IPN), admin
src/views/                EJS: pages/, partials/, admin/
public/                   css/, js/, img/
scripts/                  migrate, hash-password, generate-images
design-system/            design tokens & quy tắc UI
```

## Bảo mật đã có

CSRF token cho mọi form, Helmet CSP chặn script inline, cookie session `httpOnly`/`secure`/`sameSite`, rate-limit đăng nhập & đặt hàng, mật khẩu bcrypt, xác thực chữ ký HMAC-SHA256 của MoMo, kiểm tra tồn kho & giá lại ở server trong transaction khi đặt hàng, link xem đơn có token bí mật.
