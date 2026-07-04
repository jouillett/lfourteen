import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function POST(req: Request) {
  try {
    const { cartItemId, quantity } = await req.json();

    if (!cartItemId || quantity === undefined) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'UPDATE cart_items SET quantity = ? WHERE id = ?',
        [quantity, cartItemId]
      );
      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Update cart item error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
