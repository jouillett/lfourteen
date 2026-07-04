import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function POST(req: Request) {
  try {
    const { mobile } = await req.json();

    if (!mobile) {
      return NextResponse.json({ exists: false, message: 'Missing mobile' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      const [rows]: any = await connection.execute(
        'SELECT id FROM customers WHERE mobile = ? LIMIT 1',
        [mobile]
      );
      
      const exists = rows.length > 0;
      return NextResponse.json({ exists });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error checking user:', error);
    return NextResponse.json({ exists: false, message: 'Internal server error' }, { status: 500 });
  }
}
