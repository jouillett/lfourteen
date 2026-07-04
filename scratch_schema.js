const pool = require('./lib/db').default || require('./lib/db');
(async () => {
  const [rows] = await pool.query('DESCRIBE customers');
  console.log(rows);
  process.exit(0);
})();
