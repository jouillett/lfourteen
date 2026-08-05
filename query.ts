import pool from './lib/db'; async function run() { const [rows] = await pool.execute('SELECT * FROM orders WHERE id=58'); console.log(rows); process.exit(0); } run();
