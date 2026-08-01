import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

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
            `SELECT total_price, customer_id, status as old_status, used_point, point_recnum FROM orders WHERE id = ?`,
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
