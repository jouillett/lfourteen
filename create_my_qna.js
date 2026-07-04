import pool from './lib/db.js';

async function createTable() {
  try {
    console.log("Dropping existing my_qna if any...");
    await pool.query("DROP TABLE IF EXISTS my_qna");
    
    console.log("Creating my_qna like qna...");
    await pool.query("CREATE TABLE my_qna LIKE qna");
    
    console.log("Dropping columns order_id and is_secret...");
    await pool.query("ALTER TABLE my_qna DROP COLUMN order_id, DROP COLUMN is_secret");
    
    console.log("Table my_qna created successfully.");
  } catch (e) {
    console.error("Error:", e);
  } finally {
    process.exit(0);
  }
}

createTable();
