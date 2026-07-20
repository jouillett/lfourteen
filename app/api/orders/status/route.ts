import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();
    if (!id || status === undefined) return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // If status is changed to 3 (Cancel Complete) or 6 (Return Complete)
      if (status === 3 || status === 6) {
        const [orderRecs]: any = await connection.execute(
          `SELECT total_price, customer_id, status as old_status, used_point FROM orders WHERE id = ?`,
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
          const earnedPointAmount = Math.round(actualTotalPrice * 0.001);

          // Only process refund if the status was not already 3 or 6
          if (oldStatus !== 3 && oldStatus !== 6) {
            // 1. Deduct earned points ONLY if they were actually awarded (status >= 2)
            if (oldStatus >= 2 && earnedPointAmount > 0) {
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
            }
          }
        }
      }

      await connection.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
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
