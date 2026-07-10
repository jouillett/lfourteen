import pool from './lib/db';

async function alterTable() {
  try {
    const alterQuery = `ALTER TABLE billing ADD COLUMN billing_key TEXT;`;
    console.log("Altering billing table...");
    await pool.query(alterQuery);
    console.log("Added billing_key to billing table.");
  } catch (e) {
    console.error("Error altering table:", e);
  } finally {
    process.exit(0);
  }
}

alterTable();
