const pool = require('./lib/db').default || require('./lib/db');
(async () => {
  const [rows] = await pool.query('DESCRIBE cart_items');
  console.log(rows);
  process.exit(0);
})();
