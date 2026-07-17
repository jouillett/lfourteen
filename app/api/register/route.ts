import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function POST(req: Request) {
  try {
    const { mobile, password } = await req.json();

    if (!mobile || !password) {
      return NextResponse.json({ success: false, message: 'Missing mobile or password' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { Blowfish } = require('javascript-blowfish');
      const bf = new Blowfish('yrhan');
      const encryptedPassword = bf.base64Encode(bf.encrypt(password));

      const customerQuery = `
        INSERT INTO customers (mobile, password)
        VALUES (?, ?)
      `;
      const [customerResult]: any = await connection.execute(customerQuery, [mobile, encryptedPassword]);
      const customerId = customerResult.insertId;

      const pointsQuery = `
        INSERT INTO points (customer_id, order_id, point_amount, expired_at)
        VALUES (?, 0, 1000, DATE_ADD(NOW(), INTERVAL 30 DAY))
      `;
      await connection.execute(pointsQuery, [customerId]);

      await connection.commit();
      return NextResponse.json({ success: true, message: 'Customer registered successfully', userId: customerId });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Database error in /api/register:', error);
    // If it's a duplicate entry error, we can inform the client
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, message: '이미 가입된 전화번호입니다.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
