import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId is required' }, { status: 400 });
    }

    const [rows]: any = await pool.query(
      'SELECT point FROM customers WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
    }

    const point = Number(rows[0].point) || 0;

    return NextResponse.json({ success: true, point });
  } catch (error) {
    console.error('Failed to fetch customer point:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
