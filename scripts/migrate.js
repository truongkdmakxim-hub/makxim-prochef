const { setupDatabase } = require('../src/db/setup');
const { knex } = require('../src/db');

setupDatabase()
  .then(() => console.log('Database is up to date.'))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => knex.destroy());
