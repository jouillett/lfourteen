import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { sendSubscriptionCancelEmail, sendOrderCancelEmail, sendReturnEmail } from '@/lib/email';
import { sendOrderCancelNotification, sendReturnAlimtalk } from '@/lib/alimtalk';

export async function PATCH(req: Request) {
  try {
      const { id, status, refundBank, refundAccount, refundHolder } = await req.json();
      if (!id || status === undefined) return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // If status is changed to 3 (Cancel Complete) or 8 (Return Complete)
        if (status === 3 || status === 8) {
          const [orderRecs]: any = await connection.execute(
            `SELECT o.order_number, o.order_name, o.total_price, o.customer_id, o.status as old_status, o.used_point, o.point_recnum, o.created_at, o.payment_method,
                    c.name as customer_name, c.email as customer_email, c.mobile as customer_mobile
             FROM orders o 
             LEFT JOIN customers c ON o.customer_id = c.id 
             WHERE o.id = ?`,
            [id]
          );
          
          if (orderRecs.length > 0) {
            const orderRecord = orderRecs[0];
            
            const parseBuffer = (val: any) => {
              if (Buffer.isBuffer(val)) return val.toString('utf8');
              if (val && val.type === 'Buffer') return Buffer.from(val.data).toString('utf8');
              return val;
            };

            const actualTotalPrice = Number(parseBuffer(orderRecord.total_price)) || 0;
            const customerId = parseBuffer(orderRecord.customer_id);
            const usedPoint = Number(parseBuffer(orderRecord.used_point)) || 0;
            const oldStatus = Number(orderRecord.old_status) || 0;
            const pointRecnum = Number(Buffer.isBuffer(orderRecord.point_recnum) ? orderRecord.point_recnum.toString('utf8') : orderRecord.point_recnum) || 0;
            const pointsWereEarned = oldStatus >= 2 && oldStatus !== 99;

          // Only process refund if the status was not already 3 or 8
          if (oldStatus !== 3 && oldStatus !== 8) {
            
            // 1. Revert Used Points
            if (usedPoint > 0) {
              if (pointsWereEarned && pointRecnum > 0) {
                // If points were earned (point_recnum exists), update that record to be the refunded points instead of deleting it
                await connection.execute(
                  `UPDATE points SET point_amount = ? WHERE id = ?`,
                  [usedPoint, pointRecnum]
                );
              } else {
                // Otherwise, points weren't earned, so just insert a new refund record
                await connection.execute(
                  `INSERT INTO points (customer_id, order_id, point_amount, created_at, expired_at) VALUES (?, 0, ?, NOW(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH))`,
                  [customerId, usedPoint]
                );
              }
            } else {
              // No used points
              if (pointsWereEarned && pointRecnum > 0) {
                // Points were earned, but no used points to refund, so delete the earned point record
                await connection.execute(`DELETE FROM points WHERE id = ?`, [pointRecnum]);
              }
            }

            // Sync total points
            const [pointSumRow]: any = await connection.execute(
              `SELECT SUM(point_amount) as total FROM points WHERE customer_id = ?`,
              [customerId]
            );
            const totalPoints = pointSumRow[0]?.total || 0;
            await connection.execute(`UPDATE customers SET point = ? WHERE id = ?`, [totalPoints, customerId]);

            // Send cancellation / return notifications
            if (status === 3) {
              const customerEmail = parseBuffer(orderRecord.customer_email);
              const customerMobile = parseBuffer(orderRecord.customer_mobile);
              const orderName = parseBuffer(orderRecord.order_name) || '엘포틴 코디';
              const orderNumber = parseBuffer(orderRecord.order_number) || String(id);
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
                  console.error("Error deleting billing & billing_item on order cancel:", bErr);
                }
              }
            } else if (status === 8) {
              const customerEmail = parseBuffer(orderRecord.customer_email);
              const customerMobile = parseBuffer(orderRecord.customer_mobile);
              const customerName = parseBuffer(orderRecord.customer_name) || '고객';
              const orderName = parseBuffer(orderRecord.order_name) || '엘포틴 코디';
              const orderNumber = parseBuffer(orderRecord.order_number) || String(id);
              const rawPrice = actualTotalPrice;
              const refundAmount = Math.max(0, rawPrice - 3300);

              if (customerEmail) {
                sendReturnEmail(customerEmail, {
                  customerName,
                  orderNumber,
                  productName: orderName,
                  price: rawPrice.toLocaleString(),
                  createdAt: new Date().toISOString().split('T')[0]
                }).catch(e => console.error("Return email error:", e));
              }

              if (customerMobile) {
                sendReturnAlimtalk(customerMobile, {
                  name: customerName,
                  amount: rawPrice.toLocaleString(),
                  charge: '3,300',
                  refund: refundAmount.toLocaleString()
                }).catch(e => console.error("Return alimtalk error:", e));
              }
            }
          }
          }
        }

        // If status is changed to 2 (Delivery Complete)
        if (status === 2) {
          const [orderRecs]: any = await connection.execute(
            `SELECT total_price, customer_id, status as old_status FROM orders WHERE id = ?`,
            [id]
          );
          if (orderRecs.length > 0) {
            const orderRecord = orderRecs[0];
            const oldStatus = Number(orderRecord.old_status) || 0;
            
            if (oldStatus !== 2) {
              const parseBuffer = (val: any) => {
                if (Buffer.isBuffer(val)) return val.toString('utf8');
                if (val && val.type === 'Buffer') return Buffer.from(val.data).toString('utf8');
                return val;
              };

              const actualTotalPrice = Number(parseBuffer(orderRecord.total_price)) || 0;
              const customerId = parseBuffer(orderRecord.customer_id);
              if (customerId) {
                const [custRows]: any = await connection.execute('SELECT grade FROM customers WHERE id = ?', [customerId]);
                if (custRows.length > 0) {
                  const custGrade = custRows[0].grade;
                  if (String(custGrade) !== "8") {
                    const amount = Math.round(actualTotalPrice * 0.01);
                    if (amount > 0) {
                      // Check if already awarded
                      const [awarded]: any = await connection.execute('SELECT id FROM points WHERE order_id = ?', [id]);
                      if (awarded.length === 0) {
                        await connection.execute(
                          'INSERT INTO points (customer_id, order_id, point_amount, created_at, expired_at) VALUES (?, ?, ?, NOW(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH))',
                          [customerId, id, amount]
                        );
                        await connection.execute(
                          'UPDATE customers SET point = point + ? WHERE id = ?',
                          [amount, customerId]
                        );
                      }
                    }
                  }
                }
              }
            }
          }
        }

        let updateQuery = 'UPDATE orders SET status = ?';
        let queryParams: any[] = [status];
        if (refundBank && refundAccount && refundHolder) {
          updateQuery += ', refund_bank = ?, refund_account = ?, refund_holder = ?';
          queryParams.push(refundBank, refundAccount, refundHolder);
        }
        updateQuery += ' WHERE id = ?';
        queryParams.push(id);

        await connection.execute(updateQuery, queryParams);
      await connection.commit();
      return NextResponse.json({ success: true });
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
