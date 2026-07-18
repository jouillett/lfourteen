import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId is required' }, { status: 400 });
    }

    const [rows]: any = await pool.query(
      'SELECT point, name, mobile, zip_code, address, detail_address FROM customers WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
    }

    const point = Number(rows[0].point) || 0;
    const name = rows[0].name || '';
    const mobile = rows[0].mobile || '';
    const zip_code = rows[0].zip_code || '';
    const address = rows[0].address || '';
    const detail_address = rows[0].detail_address || '';

    return NextResponse.json({ success: true, point, name, mobile, zip_code, address, detail_address });
  } catch (error) {
    console.error('Failed to fetch customer point:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
