import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { sendSubscriptionCancelEmail, sendOrderCancelEmail } from '@/lib/email';
import { sendOrderCancelNotification } from '@/lib/alimtalk';

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [orderRecs]: any = await connection.execute(
        `SELECT o.order_number, o.order_name, o.total_price, o.customer_id, o.status, o.used_point, o.payment_method,
                c.grade as customer_grade, c.name as customer_name, c.email as customer_email, c.mobile as customer_mobile
         FROM orders o 
         LEFT JOIN customers c ON o.customer_id = c.id 
         WHERE o.id = ?`,
        [orderId]
      );
      
      if (orderRecs.length === 0) {
        throw new Error("Order not found");
      }
      
      const orderRecord = orderRecs[0];
      
      const parseBuffer = (val: any) => {
        if (Buffer.isBuffer(val)) return val.toString('utf8');
        if (val && val.type === 'Buffer') return Buffer.from(val.data).toString('utf8');
        return val;
      };

      const actualTotalPrice = Number(parseBuffer(orderRecord.total_price)) || 0;
      const customerId = parseBuffer(orderRecord.customer_id);
      const usedPoint = Number(parseBuffer(orderRecord.used_point)) || 0;
      const orderStatus = Number(orderRecord.status) || 0;
      const customerGrade = orderRecord.customer_grade;
      const earnedPointAmount = Math.round(actualTotalPrice * 0.01);

      console.log('[cancel-completed] orderId:', orderId, 'customerId:', customerId, 'status:', orderStatus, 'earnedPointAmount:', earnedPointAmount, 'usedPoint:', usedPoint, 'customerGrade:', customerGrade);

      if (String(customerGrade) !== "8") {
        // 1. Deduct earned points ONLY if they were actually awarded (status >= 2)
        if (orderStatus >= 2 && earnedPointAmount > 0) {
          const [points]: any = await connection.execute(
            `SELECT * FROM points WHERE customer_id = ? ORDER BY created_at ASC LIMIT 1`,
            [customerId]
          );
          
          if (points.length > 0) {
            const firstPoint = points[0];
            await connection.execute(
              `UPDATE points SET point_amount = GREATEST(0, point_amount - ?) WHERE id = ?`,
              [earnedPointAmount, firstPoint.id]
            );
          }

          await connection.execute(
            `UPDATE customers SET point = GREATEST(0, point - ?) WHERE id = ?`,
            [earnedPointAmount, customerId]
          );
          console.log('[cancel-completed] Deducted earned points:', earnedPointAmount);
        }

        // 2. Refund used points
        if (usedPoint > 0) {
          await connection.execute(
            `INSERT INTO points (customer_id, order_id, point_amount, created_at, expired_at) VALUES (?, 0, ?, NOW(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH))`,
            [customerId, usedPoint]
          );
          
          await connection.execute(
            `UPDATE customers SET point = point + ? WHERE id = ?`,
            [usedPoint, customerId]
          );
          console.log('[cancel-completed] Refunded used points:', usedPoint);
        }
      }

      // 3. Update order status
      await connection.execute(
        `UPDATE orders SET status = 3 WHERE id = ?`,
        [orderId]
      );

      // 4. Send cancellation notification
      try {
        const customerEmail = parseBuffer(orderRecord.customer_email);
        const customerMobile = parseBuffer(orderRecord.customer_mobile);
        const orderName = parseBuffer(orderRecord.order_name) || '엘포틴 코디';
        const orderNumber = parseBuffer(orderRecord.order_number) || String(orderId);
        const paymentMethodStr = parseBuffer(orderRecord.payment_method) || '카드';
        const isSubscription = orderName.includes('정기구독') || orderNumber.startsWith('auto_order_');

        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        if (customerEmail) {
          if (isSubscription) {
            sendSubscriptionCancelEmail(customerEmail, {
              productName: orderName,
              paymentDate: dateStr,
              amount: actualTotalPrice
            }).catch(e => console.error("Cancel email error:", e));
          } else {
            sendOrderCancelEmail(customerEmail, {
              orderNumber,
              productName: orderName,
              cancelDate: dateStr,
              amount: actualTotalPrice,
              paymentMethod: paymentMethodStr
            }).catch(e => console.error("Cancel email error:", e));
          }
        }

        if (customerMobile) {
          sendOrderCancelNotification(customerMobile, {
            orderNumber,
            product: orderName,
            amount: actualTotalPrice.toLocaleString() + '원',
            date: dateStr,
            isSubscription
          }).catch(e => console.error("Cancel notification error:", e));
        }

        // If subscription order is cancelled, also clean up billing and billing_item
        if (isSubscription && customerId) {
          try {
            const [bRows]: any = await connection.execute(
              "SELECT id, billing_key FROM billing WHERE customer_id = ?",
              [customerId]
            );
            if (bRows && bRows.length > 0) {
              const secretKey = process.env.TOSS_API_SECRET_KEY || "test_sk_E92LAa5PVbNakNYZdRnJV7YmpXyJ";
              const encodedSecretKey = Buffer.from(secretKey + ":").toString("base64");
              for (const bRow of bRows) {
                if (bRow.billing_key) {
                  try {
                    await fetch(`https://api.tosspayments.com/v1/billing/${bRow.billing_key}`, {
                      method: "DELETE",
                      headers: { Authorization: `Basic ${encodedSecretKey}` }
                    }).catch(() => {});
                  } catch (tossErr) {}
                }
                await connection.execute("DELETE FROM billing_item WHERE billing_id = ?", [bRow.id]);
              }
              await connection.execute("DELETE FROM billing WHERE customer_id = ?", [customerId]);
            }
          } catch (bErr) {
            console.error("Error deleting billing & billing_item on cancel-completed:", bErr);
          }
        }
      } catch (notifyErr) {
        console.error("Cancel completed notification error:", notifyErr);
      }

      await connection.commit();
      return NextResponse.json({ success: true, debug: { customerId, actualTotalPrice } });
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Database error in POST /api/orders/cancel-completed:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
