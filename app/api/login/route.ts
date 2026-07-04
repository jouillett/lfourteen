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
      const [userRows]: any = await connection.execute(
        'SELECT id, password FROM customers WHERE mobile = ?',
        [mobile]
      );

      if (userRows.length === 0) {
        return NextResponse.json({ success: false, reason: 'not_found', message: '가입되지 않은 전화번호입니다.' });
      }

      const { Blowfish } = require('javascript-blowfish');
      const bf = new Blowfish('yrhan');
      
      const storedPassword = userRows[0].password.toString();
      let decryptedStoredPassword = '';
      try {
        decryptedStoredPassword = bf.trimZeros(bf.decrypt(bf.base64Decode(storedPassword)));
      } catch (e) {
        // Fallback for raw text passwords
        decryptedStoredPassword = storedPassword;
      }

      if (decryptedStoredPassword !== password) {
        return NextResponse.json({ success: false, reason: 'incorrect_password', message: '비밀번호가 일치하지 않습니다.' });
      }

      await connection.execute(
        'UPDATE customers SET login = NOW() WHERE mobile = ?',
        [mobile]
      );

      const userId = userRows[0].id;
      return NextResponse.json({ success: true, message: 'Login successful', userId });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Database error in /api/login:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
