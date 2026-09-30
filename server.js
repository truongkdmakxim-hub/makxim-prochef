const config = require('./src/config');
const { setupDatabase } = require('./src/db/setup');
const { createApp } = require('./src/app');
const { knex } = require('./src/db');

async function main() {
  await setupDatabase();
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`Makxim ProChef running at ${config.baseUrl} (db: ${config.db.client})`);
  });

  const shutdown = () => {
    server.close(() => knex.destroy().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
