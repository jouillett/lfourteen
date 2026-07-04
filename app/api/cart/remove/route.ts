import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function POST(req: Request) {
  try {
    const { cartItemId } = await req.json();

    if (!cartItemId) {
      return NextResponse.json({ success: false, message: 'Missing cartItemId' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      await connection.execute('DELETE FROM cart_items WHERE id = ?', [cartItemId]);
      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Remove cart item error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
