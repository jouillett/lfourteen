import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { ResultSetHeader, RowDataPacket } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { customer_id, order_id } = await req.json();

    if (!customer_id || !order_id) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [orderItems] = await connection.execute<RowDataPacket[]>(
        'SELECT product_id, price_id, quantity FROM order_items WHERE order_id = ?',
        [order_id]
      );

      for (const item of orderItems) {
        // Check if item already exists in cart
        const [existing] = await connection.execute<RowDataPacket[]>(
          'SELECT id FROM cart_items WHERE customer_id = ? AND product_id = ? AND priced_id = ?',
          [customer_id, item.product_id, item.price_id]
        );

        if (existing.length > 0) {
          // Increase quantity
          await connection.execute<ResultSetHeader>(
            'UPDATE cart_items SET quantity = quantity + ? WHERE customer_id = ? AND product_id = ? AND priced_id = ?',
            [item.quantity, customer_id, item.product_id, item.price_id]
          );
        } else {
          // Insert new item
          await connection.execute<ResultSetHeader>(
            'INSERT INTO cart_items (customer_id, product_id, priced_id, quantity) VALUES (?, ?, ?, ?)',
            [customer_id, item.product_id, item.price_id, item.quantity]
          );
        }
      }

      await connection.commit();
      return NextResponse.json({ success: true, count: orderItems.length });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Reorder error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
