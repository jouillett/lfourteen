import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Missing userId' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      await connection.execute('DELETE FROM cart_items WHERE customer_id = ?', [userId]);
      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Empty cart error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
