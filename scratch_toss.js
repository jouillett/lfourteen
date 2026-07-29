const mysql = require('mysql2/promise');
require('dotenv').config({path: '.env'});

async function check() {
  const db = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT
  });
  
  const [rows] = await db.execute('SELECT id, payment_key, total_price, refund_bank, refund_account, refund_holder FROM orders WHERE id = 65');
  const order = rows[0];
  db.end();

  const paymentKey = order.payment_key.toString('utf8');
  const secretKey = process.env.TOSS_API_SECRET_KEY || process.env.TOSS_SECRET_KEY || 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';
  const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
  
  const refundAmount = Math.max(0, order.total_price - 3300);
  const cancelBody = {
    cancelReason: '반품 완료',
    cancelAmount: refundAmount 
  };
  
  if (order.refund_bank && order.refund_account && order.refund_holder) {
    cancelBody.refundReceiveAccount = {
      bank: order.refund_bank.toString('utf8'),
      accountNumber: order.refund_account.toString('utf8'),
      holderName: order.refund_holder.toString('utf8')
    };
  }

  console.log("Canceling Toss...", cancelBody);
  
  const res = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(cancelBody),
  });
  
  const data = await res.json();
  console.log("Response:", res.status, data);
}

check();
