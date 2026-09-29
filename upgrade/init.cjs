// Create upgrade/data.db (or UPGRADE_DB) and seed the owner when the table is empty.
//   npm run upgrade:init
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const dbTools = require('./db.cjs');

async function main() {
  const dbPath = process.env.UPGRADE_DB
    ? path.resolve(process.cwd(), process.env.UPGRADE_DB)
    : dbTools.defaultDbPath();
  const db = dbTools.openDatabase(dbPath);
  try {
    await dbTools.migrate(db);
    const seeded = await dbTools.ensureOwner(db);
    console.log('Database initialized at', dbPath);
    if (seeded.seeded) {
      console.log('Seeded owner', seeded.email);
    } else {
      console.log('Owner already present; password was not changed. Delete the db file to re-seed.');
    }
  } finally {
    await new Promise((resolve, reject) => db.close((err) => (err ? reject(err) : resolve())));
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
