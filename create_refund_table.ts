import pool from './lib/db';

(async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS refund (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        customer_id BIGINT,
        memo VARCHAR(100),
        total_price INT,
        shipment VARCHAR(50),
        \`return\` VARCHAR(50),
        receiver_name VARCHAR(80),
        receiver_mobile VARCHAR(20),
        receiver_phone VARCHAR(20),
        receiver_address VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await pool.query(createTableQuery);
    console.log("refund table created successfully!");
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    process.exit(0);
  }
})();
