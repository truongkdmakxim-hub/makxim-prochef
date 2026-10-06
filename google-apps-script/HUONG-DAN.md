# Đưa ProChef lên prochef.makxim.vn (bản web tĩnh)

Web tĩnh chạy trên GitHub Pages (miễn phí). Giỏ hàng lưu trên trình duyệt của khách; đơn hàng gửi về Google Sheet và email.

## A. Nhận đơn về Google Sheet (làm 1 lần, ~5 phút)

1. Vào https://sheets.new (tài khoản Google của Makxim), đặt tên: **Đơn hàng – ProChef**.
2. **Tiện ích mở rộng → Apps Script** → xoá nội dung mặc định, dán toàn bộ file `Code.gs` trong thư mục này → **Lưu**.
   - Email nhận thông báo đơn mới: dòng `const NOTIFY_EMAIL = 'kinhdoanh@makxim.vn';` (để `''` nếu không cần).
3. Chọn hàm **setup** → **Chạy** → cấp quyền (**Nâng cao → Đi tới dự án → Cho phép**).
4. **Triển khai → Tùy chọn triển khai mới → Ứng dụng web**:
   - Thực thi dưới dạng: **Tôi** · Người có quyền truy cập: **Bất kỳ ai** → **Triển khai**.
5. Sao chép **URL ứng dụng web** (`https://script.google.com/macros/s/.../exec`), thêm vào file `.env`:

   ```
   ORDER_ENDPOINT=https://script.google.com/macros/s/XXXX/exec
   ```

## B. Xuất và đăng web

```bash
npm run deploy:static
```

Lệnh này lấy sản phẩm từ database trên máy (sửa trong trang admin `npm run dev` → http://localhost:3000/admin), xuất ra `dist/` rồi đẩy lên nhánh `gh-pages`.
**Mỗi lần sửa sản phẩm, giá, ảnh → chạy lại lệnh này.**

## C. Bật GitHub Pages (làm 1 lần)

GitHub → repo `makxim-prochef` → **Settings → Pages**:
- Source: **Deploy from a branch** · Branch: **gh-pages** / **(root)** → Save.
- Custom domain: `prochef.makxim.vn` → Save. Khi DNS đã trỏ, tích **Enforce HTTPS**.

## D. Trỏ tên miền (làm 1 lần, tại nơi quản lý DNS của makxim.vn)

Thêm bản ghi:

| Loại | Tên (Host) | Giá trị | TTL |
|---|---|---|---|
| CNAME | `prochef` | `truongkdmakxim-hub.github.io` | 3600 |

Web makxim.vn hiện tại không bị ảnh hưởng. DNS cập nhật sau 5 phút – vài giờ.

## Lưu ý
- Sửa `Code.gs` sau này: **Triển khai → Quản lý việc triển khai → Chỉnh sửa → Phiên bản mới → Triển khai** (URL giữ nguyên).
- Cột **Trạng thái** mặc định "Mới" – đổi thành "Đã gọi", "Đã giao"… để theo dõi.
- Bản web tĩnh không có mã giảm giá, MoMo, tra cứu đơn. Bản Node.js đầy đủ vẫn giữ trong mã nguồn để chuyển sang khi cần.
