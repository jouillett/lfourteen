import { NextResponse } from 'next/server';
import pool, { RowDataPacket } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        o.id as order_id, 
        p.name as product_name, 
        (oi.quantity * pr.quantity) as total_qty, 
        (oi.quantity * pr.price) as total_price, 
        DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i:%s') as created_at_str, 
        o.receiver_name as customer_name
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN prices pr ON oi.price_id = pr.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.status = 0
      ORDER BY o.created_at DESC
    `);
    
    return NextResponse.json({ success: true, orders: rows });
  } catch (error: any) {
    console.error('Failed to fetch ordered list:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
