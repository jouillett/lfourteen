import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { executeBillingPayment } from "@/app/actions/billing";

export async function GET(request: Request) {
  try {
    // Basic authorization for Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const [rows]: any = await pool.query(
      `SELECT b.*, bi.priced_id as price_id
       FROM billing b
       LEFT JOIN billing_item bi ON b.id = bi.billing_id
       WHERE DATE(b.next_billing_at) <= CURDATE()`
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, message: 'No billings to process today.', count: 0 });
    }

    const results = [];

    for (const row of rows) {
      try {
        const { customer_id, billing_key, customer_key, price_id, id: billingId } = row;
        
        // Ensure we have required data
        if (!price_id) {
            results.push({ billingId, success: false, error: 'Missing price_id in billing_item' });
            continue;
        }

        // Execute payment
        const paymentResult = await executeBillingPayment(customer_id, billing_key, customer_key, price_id);

        if (paymentResult.success) {
            // Update next_billing_at
            // period: 0 = weeks, 1 = months
            // We use the interval column from the billing table
            const updateQuery = `
              UPDATE billing 
              SET next_billing_at = IF(period = 0, DATE_ADD(NOW(), INTERVAL \`interval\` * 7 DAY), DATE_ADD(NOW(), INTERVAL \`interval\` MONTH))
              WHERE id = ?
            `;
            await pool.query(updateQuery, [billingId]);
            
            results.push({ billingId, success: true, orderId: paymentResult.orderId });
        } else {
            results.push({ billingId, success: false, message: paymentResult.message || 'Payment failed' });
        }
      } catch (err: any) {
        console.error(`Error processing billing ${row.id}:`, err);
        results.push({ billingId: row.id, success: false, error: err.message });
      }
    }

    return NextResponse.json({ success: true, count: rows.length, results });

  } catch (error: any) {
    console.error("Cron billing error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
