const mysql = require('mysql2/promise');

async function test() {
  const pool = mysql.createPool({
    host: 'capofcom.cafe24.com',
    port: 3306,
    user: 'capofcom',
    password: 'daffodil65!!',
    database: 'capofcom'
  });

  try {
    const [rows] = await pool.query('SELECT * FROM cart_items ORDER BY id DESC LIMIT 5');
    console.log("Cart items:", rows);
  } catch(e) {
    console.log("DB error:", e.message);
  } finally {
    pool.end();
  }
}
test();
