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
    await pool.query('UPDATE orders SET shipment = ? WHERE id = 11', ['3393507554']);
    console.log("Reverted shipment to 3393507554");
  } catch(e) {
    console.log("DB error:", e.message);
  } finally {
    pool.end();
  }
}
test();
