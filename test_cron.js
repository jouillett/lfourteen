const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
  });

  const connection = await pool.getConnection();
  try {
    const [points] = await connection.execute('SELECT * FROM points');
    console.log('Points table:', points);
    
    const [expiredPoints] = await connection.execute('SELECT id, customer_id, point_amount FROM points WHERE expired_at < CURDATE()');
    console.log('Expired points according to query:', expiredPoints);
    
  } catch (e) {
    console.error(e);
  } finally {
    connection.release();
    pool.end();
  }
}
run();
