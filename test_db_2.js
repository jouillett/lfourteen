const mysql = require('mysql2/promise');
async function test() {
  const pool = mysql.createPool({ host: 'capofcom.cafe24.com', port: 3306, user: 'capofcom', password: 'daffodil65!!', database: 'capofcom' });
  try {
    const [rows] = await pool.query('SELECT id, password FROM customers WHERE mobile = "01091976740"');
    console.log(rows);
  } catch(e) { console.error(e); } finally { pool.end(); }
}
test();
