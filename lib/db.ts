import mysql from 'mysql2/promise';

let pool: mysql.Pool;

const poolConfig = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

if (process.env.NODE_ENV === 'production') {
  pool = mysql.createPool(poolConfig);
} else {
  let globalWithMySql = global as typeof globalThis & {
    _mysqlPool?: mysql.Pool;
  };
  
  if (!globalWithMySql._mysqlPool) {
    globalWithMySql._mysqlPool = mysql.createPool(poolConfig);
  }
  pool = globalWithMySql._mysqlPool;
}

export default pool;
