import mysql from 'mysql2/promise';

export type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'capofcom.cafe24.com',
  user: process.env.MYSQL_USER || 'capofcom',
  password: process.env.MYSQL_PASSWORD || 'daffodil65!!',
  database: process.env.MYSQL_DATABASE || 'capofcom',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
