const SAMPLE = {
  slug: 'nen-chon-bep-tu-don-hay-bep-tu-doi',
  title: 'Nên chọn bếp từ đơn hay bếp từ đôi cho gia đình?',
  excerpt: 'So sánh bếp từ đơn và bếp từ đôi theo số người ăn, diện tích bếp và thói quen nấu nướng để chọn đúng ngay từ đầu.',
  content: [
    'Bếp từ đơn và bếp từ đôi đều nấu nhanh, an toàn và tiết kiệm điện. Khác biệt nằm ở số vùng nấu, kích thước và cách lắp đặt.',
    '## Khi nào nên chọn bếp từ đơn?',
    '- Nhà 1–2 người, căn hộ nhỏ hoặc phòng trọ.\n- Cần bếp phụ để ăn lẩu, nướng hoặc mang đi.\n- Muốn đặt trên mặt bàn, không cần khoét đá.',
    '## Khi nào nên chọn bếp từ đôi?',
    '- Nhà từ 3 người trở lên, nấu cơm hằng ngày.\n- Muốn nấu canh và xào cùng lúc để tiết kiệm thời gian.\n- Muốn lắp âm cho gian bếp gọn gàng.',
    '## Gợi ý từ ProChef',
    'Xem **bảng so sánh** để đối chiếu công suất và tính năng: [So sánh bếp từ ProChef](/so-sanh).',
  ].join('\n\n'),
};

/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable('posts', (t) => {
    t.increments('id').primary();
    t.string('slug', 160).notNullable().unique();
    t.string('title', 200).notNullable();
    t.string('excerpt', 500);
    t.text('content');
    t.string('cover_image', 500);
    t.string('meta_title', 200);
    t.string('meta_description', 300);
    t.text('product_ids'); // JSON array of related product ids
    t.boolean('is_published').notNullable().defaultTo(false);
    t.timestamp('published_at').nullable().index();
    t.timestamps(true, true);
  });
  // A draft to show the format; it stays hidden until published in Admin → Tin tức.
  await knex('posts').insert({ ...SAMPLE, product_ids: '[]', is_published: false });
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('posts');
};
