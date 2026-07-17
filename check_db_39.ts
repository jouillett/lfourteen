import pool from './lib/db';

async function check() {
  const [orders] = await pool.query('SELECT * FROM orders WHERE id = 39');
  console.log('Order:', orders);
  const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = 39');
  console.log('Items:', items);
  const [billing] = await pool.query('SELECT * FROM billing');
  console.log('Billing:', billing);
  process.exit(0);
}
check();
