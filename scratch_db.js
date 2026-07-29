const mysql = require('mysql2/promise');
require('dotenv').config({path: '.env'});
async function check() {
  const db = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT
  });
  const [rows] = await db.execute('SELECT id, status, shipment, `return`, reshipment, order_name FROM orders WHERE id = 65');
  console.log(rows[0]);
  
  if (rows[0] && rows[0].return) {
    console.log("return buffer string:", rows[0].return.toString('utf8'));
  }
  
  db.end();
}
check();
