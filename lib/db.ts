import mysql from 'mysql2/promise';

// Custom types to replace mysql2 types
export interface RowDataPacket {
  [column: string]: any;
}

export interface ResultSetHeader {
  affectedRows: number;
  insertId: number;
}

const isVercel = process.env.VERCEL === "1";

interface DBPool {
  query: <T = any>(sqlQuery: string, params?: any) => Promise<[T, any]>;
  execute: <T = any>(sqlQuery: string, params?: any) => Promise<[T, any]>;
  getConnection: () => Promise<{
    query: <T = any>(sqlQuery: string, params?: any) => Promise<[T, any]>;
    execute: <T = any>(sqlQuery: string, params?: any) => Promise<[T, any]>;
    release: () => void;
    beginTransaction: () => Promise<void>;
    commit: () => Promise<void>;
    rollback: () => Promise<void>;
  }>;
}

let pool: DBPool;
if (isVercel) {
  const PHP_API_URL = "http://capofcom.cafe24.com/l14_coordy/db_api.php";
  const SECRET_KEY = process.env.PHP_API_SECRET_KEY || "v9kP2xM5nL8jQ4wR7tY1bC6fH3zD0gS8mN5vX2kP9jL4cR7wT1bY6fH3zM0gS8";

  const bridgePool = {
    // We mimic the mysql2 pool.query function signature
    query: async <T = any>(sqlQuery: string, params: any[] = []): Promise<[T, any]> => {
      try {
        const response = await fetch(PHP_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret_key: SECRET_KEY,
            query: sqlQuery,
            params: params
          })
        });

        let result;
        const rawText = await response.text();
        try {
          result = JSON.parse(rawText);
        } catch (e) {
          console.error("RAW PHP RESPONSE:", rawText);
          throw new Error(`HTTP ${response.status} OK but invalid JSON received. Raw text: ${rawText.substring(0, 100)}`);
        }

        if (!response.ok) {
          if (result && result.error) {
            throw new Error(`Database Error: ${result.error}`);
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!result.success) {
          throw new Error(result.error || "Database API Error");
        }

        // mysql2 normally returns an array where the first element is the rows/result
        // We format the PHP response to match what the rest of your app expects
        if (result.data) {
          return [result.data as T, null]; // For SELECT queries
        } else {
          // For INSERT/UPDATE/DELETE queries
          return [{
            affectedRows: result.affected_rows,
            insertId: result.last_insert_id
          } as unknown as T, null];
        }
      } catch (error) {
        console.error("Failed to fetch from PHP DB API:", error);
        throw error;
      }
    },
    
    // Add execute to pool object as well
    execute: async <T = any>(sqlQuery: string, params: any[] = []): Promise<[T, any]> => bridgePool.query<T>(sqlQuery, params),
    
    // Provide a mock connection for backwards compatibility with mysql2's pool.getConnection()
    getConnection: async () => {
      return {
        query: async <T = any>(sqlQuery: string, params: any[] = []): Promise<[T, any]> => bridgePool.query<T>(sqlQuery, params),
        execute: async <T = any>(sqlQuery: string, params: any[] = []): Promise<[T, any]> => bridgePool.query<T>(sqlQuery, params),
        release: () => {}, // No-op since HTTP is stateless
        beginTransaction: async () => {
          console.warn("Transactions are not fully supported over the basic PHP API bridge yet.");
        },
        commit: async () => {},
        rollback: async () => {}
      };
    }
  };

  pool = bridgePool;
} else {
  // Use direct mysql2 connection pool
  const globalForMysql = global as unknown as { mysqlPool: mysql.Pool };

  if (!globalForMysql.mysqlPool) {
    globalForMysql.mysqlPool = mysql.createPool({
      host: process.env.MYSQL_HOST || "capofcom.cafe24.com",
      user: process.env.MYSQL_USER || "capofcom",
      password: process.env.MYSQL_PASSWORD || "daffodil65!!",
      database: process.env.MYSQL_DATABASE || "capofcom",
      port: parseInt(process.env.MYSQL_PORT || "3306"),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      typeCast: function (field, next) {
        if (field.type === 'VAR_STRING' || field.type === 'STRING' || field.type === 'BLOB') {
          const buf = field.buffer();
          return buf ? buf.toString('utf8') : null;
        }
        return next();
      }
    });
  }

  pool = globalForMysql.mysqlPool as unknown as DBPool;
}

export default pool;
