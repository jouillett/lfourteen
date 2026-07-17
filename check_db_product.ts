import pool from './lib/db';

async function check() {
  const [products] = await pool.query('SELECT id, name, description FROM products WHERE id = 1');
  console.log('Products:', products);
  const [prices] = await pool.query('SELECT * FROM prices WHERE id = 1');
  console.log('Prices:', prices);
  process.exit(0);
}
check();
