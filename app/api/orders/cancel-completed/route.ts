import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

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
        `SELECT total_price, customer_id, status, used_point FROM orders WHERE id = ?`,
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
      const earnedPointAmount = Math.round(actualTotalPrice * 0.001);

      console.log('[cancel-completed] orderId:', orderId, 'customerId:', customerId, 'status:', orderStatus, 'earnedPointAmount:', earnedPointAmount, 'usedPoint:', usedPoint);

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

      // 3. Update order status
      await connection.execute(
        `UPDATE orders SET status = 3 WHERE id = ?`,
        [orderId]
      );

      await connection.commit();
      return NextResponse.json({ success: true, debug: { customerId, amount, actualTotalPrice } });
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
