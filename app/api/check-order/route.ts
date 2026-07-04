import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');

    if (!customerId) {
      return NextResponse.json({ success: false, message: 'Missing customerId' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      let query = 'SELECT COUNT(*) as count FROM orders WHERE customer_id = ?';
      let params: any[] = [customerId];

      if (status) {
        // Handle comma-separated statuses like "2,4"
        const statusArray = status.split(',');
        const placeholders = statusArray.map(() => '?').join(',');
        query += ` AND status IN (${placeholders})`;
        params.push(...statusArray);
      }
      
      const statusGreaterThan = searchParams.get('statusGreaterThan');
      if (statusGreaterThan) {
        query += ' AND status > ?';
        params.push(parseInt(statusGreaterThan, 10));
      }
      
      const unreviewed = searchParams.get('unreviewed');
      if (unreviewed === 'true') {
        query += ' AND is_reviewed = 0';
      }

      const [orderRows]: any = await connection.execute(query, params);

      const count = orderRows[0].count;
      const hasOrder = count > 0;
      return NextResponse.json({ success: true, hasOrder, count });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Database error in /api/check-order:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
