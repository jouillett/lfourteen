import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function POST(req: Request) {
  try {
    const { userId, usedPoints } = await req.json();

    if (!userId || !usedPoints || Number(usedPoints) <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid parameters' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      let pointsToDeduct = Number(usedPoints);

      // 1. Deduct from points table records (oldest expiring first)
      const [pointRecords]: any = await connection.execute(
        `SELECT id, point_amount FROM points WHERE customer_id = ? ORDER BY expired_at ASC FOR UPDATE`,
        [userId]
      );

      for (const record of pointRecords) {
        if (pointsToDeduct <= 0) break;
        
        const available = record.point_amount;
        if (available <= pointsToDeduct) {
          // Consume this record completely
          await connection.execute(`DELETE FROM points WHERE id = ?`, [record.id]);
          pointsToDeduct -= available;
        } else {
          // Consume partially
          await connection.execute(`UPDATE points SET point_amount = point_amount - ? WHERE id = ?`, [pointsToDeduct, record.id]);
          pointsToDeduct = 0;
        }
      }

      // 2. Deduct used points from customers.point (minimum 0)
      await connection.execute(
        `UPDATE customers SET point = GREATEST(0, point - ?) WHERE id = ?`,
        [Number(usedPoints), userId]
      );

      await connection.commit();
      return NextResponse.json({ success: true });
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Deduct points error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
