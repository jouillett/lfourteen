import pool from './lib/db';

async function check() {
  try {
    const [rows] = await pool.query("DESCRIBE cart_items");
    console.table(rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

check();
