const STARTER_REVIEWS = [
  { name: 'Chị Thu Hà', place: 'Cầu Giấy, Hà Nội', product: 'ProChef D7 Inverter', rating: 5, text: 'Nồi phở ninh cả buổi sáng lửa vẫn liu riu đều, không phải canh. Mặt kính lau một lần là sạch bóng.' },
  { name: 'Anh Minh Quân', place: 'Thủ Đức, TP. HCM', product: 'ProChef S3 Inverter', rating: 5, text: 'Mua để ăn lẩu cuối tuần mà giờ dùng hằng ngày. Chế độ Boost đun nước nhanh hơn ấm siêu tốc.' },
  { name: 'Chị Lan Anh', place: 'Hải Châu, Đà Nẵng', product: 'ProChef D5 Duo', rating: 5, text: 'Giao hàng nhanh, kỹ thuật viên lắp âm gọn gàng. Hai vùng nấu đủ cho bữa cơm nhà 4 người.' },
];

/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable('reviews', (t) => {
    t.increments('id').primary();
    t.string('name', 80).notNullable();
    t.string('place', 120);
    t.string('product', 160);
    t.integer('rating').unsigned().notNullable().defaultTo(5);
    t.text('text').notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });
  // Keep the homepage looking the same until the shop replaces these in Admin → Đánh giá.
  await knex('reviews').insert(STARTER_REVIEWS.map((r, i) => ({ ...r, sort_order: i })));
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('reviews');
};
