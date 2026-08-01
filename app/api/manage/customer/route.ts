import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, message: 'Missing customer ID' }, { status: 400 });
  }

  try {
    const connection = await pool.getConnection();
    try {
      const [rows]: any = await connection.execute(
        'SELECT id, name, grade, mobile, phone, email, zip_code, address, detail_address, point, memo, created_at, updated_at FROM customers WHERE id = ?',
        [id]
      );

      if (rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
      }

      const customer = rows[0];
      for (const key in customer) {
        if (Buffer.isBuffer(customer[key])) {
          customer[key] = customer[key].toString('utf8');
        }
      }

      return NextResponse.json({ success: true, customer });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database error in GET /api/manage/customer:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, grade, mobile, phone, email, zip_code, address, detail_address, point, memo } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing customer ID' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `UPDATE customers SET 
          name = ?, grade = ?, mobile = ?, phone = ?, email = ?, 
          zip_code = ?, address = ?, detail_address = ?, point = ?, memo = ?, updated_at = NOW() 
         WHERE id = ?`,
        [name, grade, mobile, phone, email, zip_code, address, detail_address, point, memo, id]
      );

      return NextResponse.json({ success: true, message: 'Customer updated successfully' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database error in PUT /api/manage/customer:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
