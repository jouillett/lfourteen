import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function POST(req: Request) {
  try {
    const { mobile, password, name, redirect } = await req.json();

    if (!mobile || !password) {
      return NextResponse.json({ success: false, message: 'Missing mobile or password' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { Blowfish } = require('javascript-blowfish');
      const bf = new Blowfish('yrhan');
      const encryptedPassword = bf.base64Encode(bf.encrypt(password));

      const isBandwalk =
        typeof redirect === 'string' &&
        (redirect.includes('bandwalk') ||
          redirect.includes('올바른걷기') ||
          redirect.includes('%EC%98%AC%EB%B0%94%EB%A5%B8%EA%B1%B7%EA%B8%B0'));

      const initialGrade = isBandwalk ? 7 : 9;

      const customerQuery = `
        INSERT INTO customers (mobile, password, name, grade, point)
        VALUES (?, ?, ?, ?, 0)
      `;
      const [customerResult]: any = await connection.execute(customerQuery, [
        mobile, 
        encryptedPassword, 
        name ? String(name).trim() : '',
        initialGrade
      ]);
      const customerId = customerResult.insertId;

      // 올바른걷기 회원은 웰컴 포인트 지급 대상 제외
      let givePoints = !isBandwalk;
      if (givePoints) {
        // Check if user exists in quit table
        const [quitRows]: any = await connection.execute(
          'SELECT created_at FROM quit WHERE mobile = ? ORDER BY created_at DESC LIMIT 1', 
          [mobile]
        );

        if (quitRows.length > 0) {
          const quitDate = new Date(quitRows[0].created_at);
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          if (quitDate > oneYearAgo) {
            givePoints = false;
          }
        }

        if (givePoints) {
          const pointsQuery = `
            INSERT INTO points (customer_id, order_id, point_amount, expired_at)
            VALUES (?, 0, 1000, DATE_ADD(NOW(), INTERVAL 1 MONTH))
          `;
          await connection.execute(pointsQuery, [customerId]);
          await connection.execute('UPDATE customers SET point = 1000 WHERE id = ?', [customerId]);

          if (quitRows.length > 0) {
            await connection.execute('DELETE FROM quit WHERE mobile = ?', [mobile]);
          }
        }
      }

      await connection.commit();
      return NextResponse.json({ success: true, message: 'Customer registered successfully', userId: customerId, grade: initialGrade });
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
