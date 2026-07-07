import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { ResultSetHeader, RowDataPacket } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { customer_id, product_id, priced_id, quantity, force } = await req.json();

    if (!customer_id || !product_id || !priced_id || !quantity) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM cart_items WHERE customer_id = ? AND product_id = ? AND priced_id = ?',
        [customer_id, product_id, priced_id]
      );

      if (rows.length > 0) {
        if (!force) {
          return NextResponse.json({ success: true, exists: true });
        } else {
          await connection.execute<ResultSetHeader>(
            'UPDATE cart_items SET quantity = quantity + ? WHERE customer_id = ? AND product_id = ? AND priced_id = ?',
            [quantity, customer_id, product_id, priced_id]
          );
          return NextResponse.json({ success: true });
        }
      } else {
        await connection.execute<ResultSetHeader>(
          'INSERT INTO cart_items (customer_id, product_id, priced_id, quantity) VALUES (?, ?, ?, ?)',
          [customer_id, product_id, priced_id, quantity]
        );
        return NextResponse.json({ success: true });
      }
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Add to cart error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
