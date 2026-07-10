import pool from './lib/db';

async function createTables() {
  try {
    const createBillingTable = `
      CREATE TABLE IF NOT EXISTS billing (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        customer_id BIGINT NOT NULL,
        \`interval\` INT NOT NULL,
        period INT NOT NULL COMMENT '0: week; 1: month',
        next_billing_at TIMESTAMP NULL,
        customer_key TEXT,
        method TEXT,
        card_issuer_code TEXT,
        card_number TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT NULL
      );
    `;

    const createBillingItemTable = `
      CREATE TABLE IF NOT EXISTS billing_item (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        billing_id BIGINT NOT NULL,
        product_id BIGINT NOT NULL,
        priced_id BIGINT NOT NULL,
        quantity INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (billing_id) REFERENCES billing(id) ON DELETE CASCADE
      );
    `;

    console.log("Creating billing table...");
    await pool.query(createBillingTable);
    console.log("Created billing table.");

    console.log("Creating billing_item table...");
    await pool.query(createBillingItemTable);
    console.log("Created billing_item table.");

  } catch (e) {
    console.error("Error creating tables:", e);
  } finally {
    process.exit(0);
  }
}

createTables();
