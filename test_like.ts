import pool from './lib/db';

async function check() {
  const [orders] = await pool.query('SELECT id, order_name FROM orders WHERE order_name LIKE "%정기%"');
  console.log('Found:', orders);
  process.exit(0);
}
check();
