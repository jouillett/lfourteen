const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'lfourteen'
  });
  
  const [accuse] = await connection.query('DESCRIBE accuse');
  console.log('accuse:', accuse);
  
  const [orders] = await connection.query('DESCRIBE orders');
  console.log('orders:', orders);
  
  await connection.end();
}

check().catch(console.error);
