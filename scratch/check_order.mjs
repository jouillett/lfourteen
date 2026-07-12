import mysql from 'mysql2/promise';

async function test() {
  const pool = mysql.createPool({
    host: 'capofcom.cafe24.com',
    port: 3306,
    user: 'capofcom',
    password: 'daffodil65!!',
    database: 'capofcom'
  });

  try {
    const [rows] = await pool.query(`
      SELECT o.id, o.status, o.shipment, c.email, c.id as customer_id
      FROM orders o 
      LEFT JOIN customers c ON o.customer_id = c.id 
      ORDER BY o.id DESC LIMIT 10
    `);
    console.log("Recent orders:", rows);
  } catch(e) {
    console.log("DB error:", e.message);
  } finally {
    pool.end();
  }
}
test();
