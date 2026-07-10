require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT || 3306,
  });

  const [orders] = await pool.query('SELECT * FROM orders ORDER BY id DESC LIMIT 1');
  console.log('Latest Order:', orders[0]);

  pool.end();
}
run();
