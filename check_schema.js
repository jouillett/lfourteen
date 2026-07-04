import pool from './lib/db.js';

async function check() {
  try {
    const [rows] = await pool.query("DESCRIBE customers");
    console.log(rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

check();
