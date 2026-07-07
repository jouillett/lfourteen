import { NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { RowDataPacket } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('id');
    const customerId = searchParams.get('customerId');

    if (!orderId || !customerId) {
      return NextResponse.json({ success: false, message: 'Missing orderId or customerId' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      const [orderRows]: any = await connection.execute(
        `SELECT * FROM orders WHERE id = ? AND customer_id = ?`,
        [orderId, customerId]
      );

      if (orderRows.length === 0) {
        return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
      }

      const order = { ...orderRows[0] };
      for (const key in order) {
        if (Buffer.isBuffer(order[key])) {
          order[key] = order[key].toString('utf8');
        } else if (order[key] && order[key].type === 'Buffer') {
          order[key] = Buffer.from(order[key].data).toString('utf8');
        }
      }

      const [items]: any = await connection.execute(`
        SELECT 
          oi.quantity as order_quantity,
          p.name as product_name,
          p.image as product_image,
          pr.quantity as option_quantity_val,
          pr.price as unit_price
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN prices pr ON oi.price_id = pr.id
        WHERE oi.order_id = ?
      `, [order.id]);

      const processedItems = items.map((item: any) => {
        const pItem = { ...item };
        for (const key in pItem) {
          if (Buffer.isBuffer(pItem[key])) {
            pItem[key] = pItem[key].toString('utf8');
          } else if (pItem[key] && pItem[key].type === 'Buffer') {
            pItem[key] = Buffer.from(pItem[key].data).toString('utf8');
          }
        }
        return pItem;
      });

      const originalPrice = processedItems.reduce((acc: number, curr: any) => {
        return acc + (curr.order_quantity * curr.unit_price);
      }, 0);

      order.original_price = originalPrice;

      return NextResponse.json({ success: true, order, items: processedItems });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Database error in GET /api/order-detail:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
