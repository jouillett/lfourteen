import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing order id' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT o.id, o.order_number, o.order_name, o.customer_id, c.name as customer_name, 
               o.total_price, o.status, o.shipment, o.\`return\`, o.reshipment, o.created_at
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.id = ?
      `;
      const [rows]: any = await connection.query(query, [id]);

      if (rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
      }

      const order = { ...rows[0] };
      // Parse buffers to strings
      for (const key in order) {
        if (Buffer.isBuffer(order[key])) {
          order[key] = order[key].toString('utf8');
        } else if (order[key] && order[key].type === 'Buffer') {
          order[key] = Buffer.from(order[key].data).toString('utf8');
        }
      }

      return NextResponse.json({ success: true, order });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Database error in GET /api/anorder:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, shipment, return: returnTracking, reshipment } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing order id' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'UPDATE orders SET shipment = ?, `return` = ?, reshipment = ? WHERE id = ?',
        [shipment || null, returnTracking || null, reshipment || null, id]
      );
      return NextResponse.json({ success: true, message: 'Order updated successfully' });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Database error in PATCH /api/anorder:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
