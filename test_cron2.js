const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: 'capofcom.cafe24.com',
    port: 3306,
    user: 'capofcom',
    password: 'daffodil65!!',
    database: 'capofcom'
  });

  const connection = await pool.getConnection();
  try {
    const [points] = await connection.execute('SELECT * FROM points');
    console.log('Points table:', points);
    
    const [expiredPoints] = await connection.execute('SELECT id, customer_id, point_amount, expired_at FROM points WHERE expired_at < CURDATE()');
    console.log('Expired points according to query:', expiredPoints);
    
  } catch (e) {
    console.error(e);
  } finally {
    connection.release();
    pool.end();
  }
}
run();
