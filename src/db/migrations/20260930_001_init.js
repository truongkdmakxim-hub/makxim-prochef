/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable('products', (t) => {
    t.increments('id').primary();
    t.string('slug', 160).notNullable().unique();
    t.string('name', 160).notNullable();
    t.string('sku', 60).notNullable().unique();
    t.string('line', 10).notNullable().index(); // 'don' | 'doi'
    t.string('tagline', 255);
    t.string('short_desc', 500);
    t.text('description');
    t.integer('price').unsigned().notNullable();
    t.integer('compare_price').unsigned();
    t.integer('stock').notNullable().defaultTo(0);
    t.integer('power_w').unsigned();
    t.integer('zones').unsigned().defaultTo(1);
    t.string('badge', 40);
    t.text('highlights'); // JSON array of short strings
    t.text('specs'); // JSON array of [label, value]
    t.text('features'); // JSON array of strings
    t.text('images'); // JSON array of URLs
    t.boolean('is_active').notNullable().defaultTo(true);
    t.boolean('is_featured').notNullable().defaultTo(false);
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('coupons', (t) => {
    t.increments('id').primary();
    t.string('code', 40).notNullable().unique();
    t.string('type', 10).notNullable(); // 'percent' | 'fixed'
    t.integer('value').unsigned().notNullable();
    t.integer('min_order').unsigned().notNullable().defaultTo(0);
    t.integer('max_discount').unsigned();
    t.integer('max_uses').unsigned();
    t.integer('used_count').unsigned().notNullable().defaultTo(0);
    t.timestamp('expires_at').nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('orders', (t) => {
    t.increments('id').primary();
    t.string('code', 20).notNullable().unique();
    t.string('access_token', 64).notNullable();
    t.string('customer_name', 120).notNullable();
    t.string('phone', 20).notNullable().index();
    t.string('email', 160);
    t.string('province', 80).notNullable();
    t.string('ward', 120).notNullable();
    t.string('address', 255).notNullable();
    t.string('note', 500);
    t.integer('subtotal').unsigned().notNullable();
    t.integer('discount').unsigned().notNullable().defaultTo(0);
    t.integer('shipping_fee').unsigned().notNullable().defaultTo(0);
    t.integer('total').unsigned().notNullable();
    t.string('coupon_code', 40);
    t.string('payment_method', 10).notNullable(); // 'cod' | 'momo'
    t.string('payment_status', 12).notNullable().defaultTo('pending'); // pending | paid | failed | refunded
    t.string('status', 12).notNullable().defaultTo('new').index(); // new | confirmed | shipping | completed | cancelled
    t.string('momo_order_id', 64).index();
    t.string('momo_trans_id', 64);
    t.string('admin_note', 1000);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('order_items', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable().references('id').inTable('orders').onDelete('CASCADE');
    t.integer('product_id').unsigned();
    t.string('name', 160).notNullable();
    t.string('sku', 60);
    t.string('image', 255);
    t.integer('price').unsigned().notNullable();
    t.integer('qty').unsigned().notNullable();
    t.integer('line_total').unsigned().notNullable();
  });

  await knex.schema.createTable('admin_users', (t) => {
    t.increments('id').primary();
    t.string('email', 160).notNullable().unique();
    t.string('name', 120);
    t.string('password_hash', 120).notNullable();
    t.timestamps(true, true);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('order_items');
  await knex.schema.dropTableIfExists('orders');
  await knex.schema.dropTableIfExists('coupons');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('admin_users');
};
