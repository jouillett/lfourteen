"use server";

import pool from "@/lib/db";
import { sendSubscriptionSuccessEmail } from "@/lib/email";

export async function issueBillingKeyAndSave(
  customerKey: string,
  authKey: string,
  option: number,
  duration: number,
  period: "weeks" | "months"
) {
  const secretKey = process.env.TOSS_API_SECRET_KEY;
  if (!secretKey) throw new Error("TOSS_API_SECRET_KEY is not defined");

  const encodedSecretKey = Buffer.from(secretKey + ":").toString("base64");

  const response = await fetch("https://api.tosspayments.com/v1/billing/authorizations/issue", {
    method: "POST",
    headers: {
      Authorization: `Basic ${encodedSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customerKey,
      authKey,
    }),
  });

  const data = await response.json();
  console.log("Toss billing issue response:", JSON.stringify(data));

  if (!response.ok) {
    // If the authKey was already used, Toss returns ALREADY_PROCESSED_PAYMENT or similar.
    // Try to find any existing billing key in DB for this customer and reuse it.
    const numericKeyFallback = customerKey.replace(/^user_/, "");
    const customerIdFallback = parseInt(numericKeyFallback, 10) || 1;
    const [existingFallback]: any = await pool.query(
      "SELECT billing_key, customer_key FROM billing WHERE customer_id = ? LIMIT 1",
      [customerIdFallback]
    );
    if (existingFallback && existingFallback.length > 0) {
      console.log("Reusing existing billing record for customer", customerIdFallback);
      return { success: true, billingKey: existingFallback[0].billing_key, customerKey: existingFallback[0].customer_key, customerId: customerIdFallback };
    }
    throw new Error(`토스 빌링키 발급 실패: ${data.message || data.code || "Unknown error"}`);
  }

  const billingKey = data.billingKey;
  
  // Save to DB
  // Parse customerId from customerKey (which might be prefixed with "user_") or fallback to 1
  const numericKey = customerKey.replace(/^user_/, "");
  const customerId = parseInt(numericKey, 10) || 1; 

  const periodInt = period === "weeks" ? 0 : 1;

  try {
    const isWeeks = periodInt === 0;

    // Check if billing already exists for this customer
    const [existingRows]: any = await pool.query(
      "SELECT id, billing_key FROM billing WHERE customer_id = ?",
      [customerId]
    );

    if (existingRows && existingRows.length > 0) {
      for (const row of existingRows) {
        if (row.billing_key) {
          // Delete from Toss API
          try {
            await fetch(`https://api.tosspayments.com/v1/billing/${row.billing_key}`, {
              method: "POST", // Note: Some Toss APIs use POST or DELETE depending on version, attempting POST first
              headers: {
                Authorization: `Basic ${encodedSecretKey}`,
              }
            }).then(r => {
                if(!r.ok) {
                    return fetch(`https://api.tosspayments.com/v1/billing/authorizations/${row.billing_key}`, {
                        method: "DELETE", // Fallback to DELETE
                        headers: { Authorization: `Basic ${encodedSecretKey}` }
                    });
                }
            }).catch(e => console.error("Toss billing delete error:", e));
          } catch(e) {}
        }
      }
      // Delete from DB to prevent unique constraint error
      await pool.query("DELETE FROM billing WHERE customer_id = ?", [customerId]);
    }

    const [billingResult]: any = await pool.query(
      `INSERT INTO billing (customer_id, \`interval\`, period, next_billing_at, customer_key, billing_key) 
       VALUES (?, ?, ?, ${isWeeks ? "DATE_ADD(NOW(), INTERVAL ? DAY)" : "DATE_ADD(NOW(), INTERVAL ? MONTH)"}, ?, ?)`,
      isWeeks
        ? [customerId, duration, periodInt, duration * 7, customerKey, billingKey]
        : [customerId, duration, periodInt, duration, customerKey, billingKey]
    );

    const billingId = billingResult.insertId;

    // product_id is assumed to be 1 for now, priced_id = option
    await pool.query(
      `INSERT INTO billing_item (billing_id, product_id, priced_id, quantity)
       VALUES (?, ?, ?, ?)`,
      [billingId, 1, option, 1]
    );

    return { success: true, billingKey, customerKey, customerId };
  } catch (dbError: any) {
    console.error("DB Error:", dbError?.message || dbError);
    throw new Error("DB 저장 실패: " + (dbError?.message || String(dbError)));
  }
}

export async function executeBillingPayment(customerId: number, billingKey: string, customerKey: string, priceId: number, isFirstPayment: boolean = false) {
  try {
    // 1. Get product price from DB
    const [priceRows]: any = await pool.query("SELECT price FROM prices WHERE id = ?", [priceId]);
    if (!priceRows || priceRows.length === 0) throw new Error("Price not found");
    const amount = Number(priceRows[0].price);

    // 2. Check Customer Address and Email
    const [customerRows]: any = await pool.query(
      "SELECT name, mobile, phone, zip_code, address, detail_address, email FROM customers WHERE id = ?",
      [customerId]
    );

    if (!customerRows || customerRows.length === 0) {
      throw new Error("사용자 정보를 찾을 수 없습니다.");
    }

    const customer = customerRows[0];
    if (!customer.address) {
      return { success: false, requireAddress: true, message: "등록된 주소가 없어 진행할 수 없습니다." };
    }

    const receiverName = customer.name || '';
    const receiverMobile = customer.mobile || '';
    const receiverPhone = customer.phone || '';
    const zipCodePart = customer.zip_code ? `[${customer.zip_code}] ` : '';
    const detailPart = customer.detail_address ? ` ${customer.detail_address}` : '';
    const fullAddress = `${zipCodePart}${customer.address || ''}${detailPart}`.trim();

    // Get Product Name
    const [productRows]: any = await pool.query("SELECT name FROM products WHERE id = 1");
    const productName = productRows && productRows.length > 0 ? productRows[0].name : "L.4teen Coordi";
    
    // Set Order Name based on whether it is the first payment or a recurring payment
    const suffix = isFirstPayment ? "(정기구독 첫 결제)" : "(정기구독 결제)";
    const orderNameText = `${productName} ${suffix}`;

    // 3. Execute Toss Billing
    const orderId = "auto_order_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const secretKey = process.env.TOSS_API_SECRET_KEY;
    if (!secretKey) throw new Error("TOSS_API_SECRET_KEY is not defined in environment variables");
    const encodedSecretKey = Buffer.from(secretKey + ":").toString("base64");

    const tossRes = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedSecretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        customerKey,
        amount,
        orderId,
        orderName: orderNameText,
      })
    });

    const paymentData = await tossRes.json();
    console.log("Toss billing response status:", tossRes.status);
    console.log("Toss billing response data:", JSON.stringify(paymentData));
    if (!tossRes.ok) {
      throw new Error(`Billing execution failed: ${paymentData.message || paymentData.code}`);
    }

    // 4. Insert into orders and order_items
    const paymentMethod = paymentData.method || paymentData.type || "빌링결제";
    const [orderResult]: any = await pool.query(
      `INSERT INTO orders (order_number, order_name, customer_id, total_price, payment_key, payment_method, receiver_name, receiver_mobile, receiver_phone, receiver_address, delivery_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')`,
      [orderId, orderNameText, customerId, amount, paymentData.paymentKey, paymentMethod, receiverName, receiverMobile, receiverPhone, fullAddress]
    );

    const insertedOrderId = orderResult.insertId;

    await pool.query(
      `INSERT INTO order_items (order_id, product_id, price_id, quantity) VALUES (?, 1, ?, 1)`,
      [insertedOrderId, priceId]
    );

    if (customer.email) {
      try {
        const [billingRows]: any = await pool.query("SELECT next_billing_at FROM billing WHERE customer_id = ? ORDER BY id DESC LIMIT 1", [customerId]);
        const nextBillingAt = billingRows && billingRows.length > 0 ? billingRows[0].next_billing_at : null;
        
        const today = new Date();
        const paymentDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        let nextPaymentDateStr = '-';
        if (nextBillingAt) {
          const nextDate = new Date(nextBillingAt);
          nextPaymentDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        }

        await sendSubscriptionSuccessEmail(customer.email, {
          paymentDate: paymentDateStr,
          amount: amount,
          nextPaymentDate: nextPaymentDateStr
        });
      } catch (emailErr) {
        console.error("Failed to send subscription success email:", emailErr);
      }
    }

    return { success: true, orderId: insertedOrderId };
  } catch (error: any) {
    console.error("Execute Billing Error:", error);
    throw new Error(error.message || "Failed to execute billing payment");
  }
}
