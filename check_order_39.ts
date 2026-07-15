import pool from './lib/db';

async function run() {
  try {
    const [rows]: any = await pool.query('SELECT * FROM orders WHERE id = 39');
    console.log("Order 39:");
    if (rows.length > 0) {
      console.log("status:", rows[0].status);
      console.log("shipment:", rows[0].shipment ? (Buffer.isBuffer(rows[0].shipment) ? rows[0].shipment.toString() : rows[0].shipment) : 'NULL');
    } else {
      console.log("Not found.");
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
