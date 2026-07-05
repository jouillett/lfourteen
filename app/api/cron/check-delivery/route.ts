import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

const CARRIERS = [
  { id: "kr.cjlogistics", name: "CJ대한통운" },
  { id: "kr.lotte", name: "롯데택배" },
  { id: "kr.hanjin", name: "한진택배" },
  { id: "kr.epost", name: "우체국택배" },
  { id: "kr.logen", name: "로젠택배" },
  { id: "kr.kdexp", name: "경동택배" },
  { id: "kr.daesin", name: "대신택배" },
  { id: "kr.ilyanglogis", name: "일양로지스" },
];

const parseBuffer = (val: any): any => {
  if (Buffer.isBuffer(val)) return val.toString('utf8');
  if (val && val.type === 'Buffer') return Buffer.from(val.data).toString('utf8');
  return val;
};

async function checkDeliveryDone(shipmentString: string): Promise<boolean> {
  if (!shipmentString || !shipmentString.includes('|')) return false;

  const [cName, tNum] = shipmentString.split('|');
  const carrierName = cName.trim();
  const trackId = tNum.trim().replace(/[^0-9a-zA-Z]/g, '');

  const found = CARRIERS.find(c => c.name.includes(carrierName) || carrierName.includes(c.name));
  if (!found || !trackId) return false;

  try {
    const apiUrl = `https://apis.tracker.delivery/carriers/${found.id}/tracks/${trackId}`;
    const res = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.state?.id === 'delivered';
  } catch (error) {
    console.error('Error checking delivery:', error);
    return false;
  }
}

async function cancelTossPayment(paymentKey: string): Promise<boolean> {
  try {
    const secretKey = process.env.TOSS_SECRET_KEY || 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';
    const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
    const res = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelReason: '반품 완료' }),
    });
    return res.ok;
  } catch (error) {
    console.error('Toss cancel error:', error);
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const connection = await pool.getConnection();
    try {
      // Fetch orders with status 4, 5, or 7 — include fields needed for refund
      const [orders]: any = await connection.execute(
        'SELECT id, status, `return`, reshipment, payment_key, total_price, customer_id FROM orders WHERE status IN (4, 5, 7)'
      );

      let updatedCount = 0;

      for (const order of orders) {
        const returnField = parseBuffer(order.return);
        const reshipmentField = parseBuffer(order.reshipment);

        if (order.status === 4 && returnField) {
          // Return parcel received → 교환진행(5)
          const isDone = await checkDeliveryDone(returnField);
          if (isDone) {
            await connection.execute('UPDATE orders SET status = 5 WHERE id = ?', [order.id]);
            updatedCount++;
          }

        } else if (order.status === 5 && reshipmentField) {
          // Re-shipment delivered → 교환완료(6)
          const isDone = await checkDeliveryDone(reshipmentField);
          if (isDone) {
            await connection.execute('UPDATE orders SET status = 6 WHERE id = ?', [order.id]);
            updatedCount++;
          }

        } else if (order.status === 7 && returnField) {
          // Return parcel received → process Toss refund + DB updates → 반품완료(8)
          const isDone = await checkDeliveryDone(returnField);
          if (isDone) {
            const paymentKey = parseBuffer(order.payment_key);
            const actualTotalPrice = Number(parseBuffer(order.total_price)) || 0;
            const customerId = parseBuffer(order.customer_id);
            const amount = Math.round(actualTotalPrice * 0.001);

            // Step 1: Toss payment cancel
            const tossOk = await cancelTossPayment(paymentKey);
            if (!tossOk) {
              console.error(`[check-delivery] Toss cancel failed for order ${order.id}`);
              continue; // skip, will retry on next cron run
            }

            // Step 2-4: DB updates in a transaction
            await connection.beginTransaction();
            try {
              // Deduct from points table (oldest record for this customer)
              const [points]: any = await connection.execute(
                'SELECT * FROM points WHERE customer_id = ? ORDER BY created_at ASC LIMIT 1',
                [customerId]
              );
              if (points.length > 0) {
                await connection.execute(
                  'UPDATE points SET point_amount = point_amount - ? WHERE id = ?',
                  [amount, points[0].id]
                );
              }

              // Update customer point & total_spent
              await connection.execute(
                'UPDATE customers SET point = GREATEST(0, point - ?), total_spent = GREATEST(0, total_spent - ?) WHERE id = ?',
                [amount, actualTotalPrice, customerId]
              );

              // Set order status to 8 (반품완료)
              await connection.execute('UPDATE orders SET status = 8 WHERE id = ?', [order.id]);

              await connection.commit();
              updatedCount++;
              console.log(`[check-delivery] Order ${order.id} refunded and set to status 8`);
            } catch (dbErr) {
              await connection.rollback();
              console.error(`[check-delivery] DB error for order ${order.id}:`, dbErr);
            }
          }
        }
      }

      return NextResponse.json({ success: true, updatedCount });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Check delivery cron error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
