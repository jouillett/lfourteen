import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function POST(req: Request) {
  try {
    const { mobile, password } = await req.json();

    if (!mobile || !password) {
      return NextResponse.json({ success: false, message: 'Missing mobile or password' }, { status: 400 });
    }

    const { Blowfish } = require('javascript-blowfish');
    const bf = new Blowfish('yrhan');
    const encryptedPassword = bf.base64Encode(bf.encrypt(password));

    const query = `
      UPDATE customers 
      SET password = ?
      WHERE mobile = ?
    `;

    const [result]: any = await pool.execute(query, [encryptedPassword, mobile]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, message: '해당 전화번호로 가입된 내역이 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('Database error in /api/reset-password:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
