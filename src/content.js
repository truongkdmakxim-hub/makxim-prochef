// Nội dung tĩnh (mẫu) — chỉnh sửa trực tiếp tại đây.
const { shop } = require('./config');
const { money } = require('./utils/format');
const faqs = [
  {
    q: 'Bếp từ có dùng được mọi loại nồi không?',
    a: 'Bếp từ cần nồi có đáy nhiễm từ: inox 430, gang, thép tráng men hoặc nồi ghi rõ "dùng cho bếp từ". Mẹo kiểm tra nhanh: nam châm hút được vào đáy nồi là dùng được. Nồi nhôm, đất, thủy tinh thuần sẽ không hoạt động.',
  },
  {
    q: 'Nên chọn bếp từ đơn hay bếp từ đôi?',
    a: 'Bếp từ đơn phù hợp căn hộ nhỏ, người ở một mình hoặc làm bếp phụ (lẩu, nấu nhanh). Gia đình từ 3 người trở lên nấu cơm hằng ngày nên chọn bếp từ đôi để nấu canh và xào cùng lúc.',
  },
  {
    q: 'Bếp từ đôi cần đường điện như thế nào?',
    a: 'Bếp từ đôi 4000–4600W nên dùng ổ cắm và dây riêng tiết diện từ 4 mm², aptomat 32A. Kỹ thuật viên Makxim sẽ kiểm tra và tư vấn miễn phí khi lắp đặt.',
  },
  {
    q: 'Công nghệ Inverter khác gì bếp từ thường?',
    a: 'Bếp thường giữ lửa nhỏ bằng cách bật – tắt liên tục nên nồi sôi không đều. Inverter điều chỉnh công suất liên tục, lửa nhỏ ổn định hơn, món hầm kho ngon hơn và tiết kiệm điện đến 30%.',
  },
  {
    q: 'Chính sách bảo hành và đổi trả ra sao?',
    a: 'Bảo hành chính hãng 12 tháng với bếp từ đơn, 36 tháng với bếp từ đôi, 1 đổi 1 trong 30 ngày nếu lỗi do nhà sản xuất. Bảo hành tận nhà tại Hà Nội và TP. Hồ Chí Minh.',
  },
  {
    q: 'Tôi có thể thanh toán bằng cách nào?',
    a: `Bạn có thể thanh toán khi nhận hàng (COD) hoặc thanh toán trực tuyến qua ví MoMo. Đơn từ ${money(shop.freeShipFrom)} được miễn phí vận chuyển toàn quốc.`,
  },
];

const reviews = [
  { name: 'Chị Thu Hà', place: 'Cầu Giấy, Hà Nội', product: 'ProChef D7 Inverter', rating: 5, text: 'Nồi phở ninh cả buổi sáng lửa vẫn liu riu đều, không phải canh. Mặt kính lau một lần là sạch bóng.' },
  { name: 'Anh Minh Quân', place: 'Thủ Đức, TP. HCM', product: 'ProChef S3 Inverter', rating: 5, text: 'Mua để ăn lẩu cuối tuần mà giờ dùng hằng ngày. Chế độ Boost đun nước nhanh hơn ấm siêu tốc.' },
  { name: 'Chị Lan Anh', place: 'Hải Châu, Đà Nẵng', product: 'ProChef D5 Duo', rating: 5, text: 'Giao hàng nhanh, kỹ thuật viên lắp âm gọn gàng. Hai vùng nấu đủ cho bữa cơm nhà 4 người.' },
];

const pages = {
  'gioi-thieu': {
    title: 'Về Makxim ProChef',
    lead: 'ProChef là dòng bếp điện từ của Makxim — được thiết kế để bữa cơm gia đình Việt nhanh hơn, an toàn hơn và gian bếp luôn sạch sẽ.',
    sections: [
      { h: 'Sứ mệnh', p: ['Chúng tôi tin rằng một chiếc bếp tốt không cần phức tạp. ProChef tập trung vào những điều quan trọng nhất: nhiệt ổn định, an toàn tuyệt đối cho trẻ nhỏ và độ bền nhiều năm.'] },
      { h: 'Kiểm soát chất lượng', p: ['Mỗi chiếc bếp đều trải qua quy trình kiểm tra công suất, cách điện và chạy thử liên tục trước khi xuất xưởng. Linh kiện chính như IGBT, cuộn dây đồng và mặt kính được chọn lọc từ các nhà cung cấp uy tín.'] },
      { h: 'Dịch vụ', p: ['Đội ngũ kỹ thuật viên Makxim hỗ trợ lắp đặt, bảo hành tận nhà và tư vấn chọn bếp miễn phí qua hotline, Zalo.'] },
    ],
  },
  'chinh-sach-bao-hanh': {
    title: 'Chính sách bảo hành',
    lead: 'Sản phẩm ProChef được bảo hành chính hãng 12 tháng với bếp từ đơn, 36 tháng với bếp từ đôi, tính từ ngày giao hàng.',
    sections: [
      { h: 'Điều kiện bảo hành', p: ['Sản phẩm còn trong thời hạn bảo hành, có mã đơn hàng hoặc tem bảo hành. Lỗi phát sinh do nhà sản xuất trong điều kiện sử dụng bình thường.'] },
      { h: 'Không áp dụng bảo hành', p: ['Mặt kính nứt vỡ do va đập, sản phẩm bị vào nước, cháy nổ do nguồn điện không ổn định, tự ý tháo lắp hoặc sửa chữa tại nơi không được ủy quyền.'] },
      { h: '1 đổi 1 trong 30 ngày', p: ['Trong 30 ngày đầu, nếu sản phẩm lỗi kỹ thuật do nhà sản xuất, Makxim đổi sản phẩm mới cùng model hoặc tương đương, miễn phí vận chuyển hai chiều.'] },
    ],
  },
  'doi-tra-van-chuyen': {
    title: 'Vận chuyển & đổi trả',
    lead: `Giao hàng toàn quốc, miễn phí cho đơn từ ${money(shop.freeShipFrom)}. Kiểm tra hàng trước khi thanh toán.`,
    sections: [
      { h: 'Thời gian giao hàng', p: ['Nội thành Hà Nội, TP. Hồ Chí Minh: 1–2 ngày. Các tỉnh thành khác: 2–5 ngày làm việc. Nhân viên sẽ gọi xác nhận trước khi giao.'] },
      { h: 'Phí vận chuyển', p: [`Miễn phí cho đơn từ ${money(shop.freeShipFrom)}. Đơn dưới mức này phí đồng giá ${money(shop.shippingFee)}.`] },
      { h: 'Đổi trả', p: ['Bạn được đổi trả trong 7 ngày nếu sản phẩm còn nguyên tem, hộp và phụ kiện, chưa qua sử dụng. Liên hệ hotline để được hướng dẫn.'] },
    ],
  },
  'thanh-toan': {
    title: 'Hướng dẫn thanh toán',
    lead: 'Makxim ProChef hỗ trợ thanh toán khi nhận hàng và thanh toán trực tuyến qua ví MoMo.',
    sections: [
      { h: 'Thanh toán khi nhận hàng (COD)', p: ['Bạn thanh toán tiền mặt hoặc chuyển khoản cho nhân viên giao hàng sau khi kiểm tra sản phẩm.'] },
      { h: 'Ví MoMo', p: ['Chọn MoMo ở bước thanh toán, bạn sẽ được chuyển sang cổng MoMo để quét mã QR hoặc xác nhận trên ứng dụng. Đơn hàng được xác nhận tự động ngay khi thanh toán thành công.'] },
      { h: 'Bảo mật', p: ['Makxim không lưu trữ thông tin thẻ hay tài khoản ví của bạn. Mọi giao dịch trực tuyến được xử lý trên cổng thanh toán của MoMo.'] },
    ],
  },
};

module.exports = { faqs, reviews, pages };
