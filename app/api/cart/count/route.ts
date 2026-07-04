import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Missing userId' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM cart_items WHERE customer_id = ?',
        [userId]
      );

      const count = rows[0]?.count || 0;
      return NextResponse.json({ success: true, count: Number(count) });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Fetch cart count error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
