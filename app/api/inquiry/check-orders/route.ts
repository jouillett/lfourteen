import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ success: false, message: 'Missing customerId' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      const [rows]: any = await connection.execute(
        `SELECT 
          o.id, o.created_at, o.order_number, o.order_name, o.total_price, o.status,
          (SELECT p.image FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = o.id LIMIT 1) as image
         FROM orders o 
         WHERE o.customer_id = ? 
         ORDER BY o.created_at DESC`,
        [customerId]
      );

      // Process rows to convert any Buffers to strings
      const processedRows = rows.map((row: any) => {
        const newRow: any = {};
        for (const key in row) {
          if (Buffer.isBuffer(row[key])) {
            newRow[key] = row[key].toString('utf8');
          } else {
            newRow[key] = row[key];
          }
        }
        return newRow;
      });

      return NextResponse.json({ success: true, orders: processedRows });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
