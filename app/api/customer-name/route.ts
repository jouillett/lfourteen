import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get('customerId');
  if (!customerId) return NextResponse.json({ success: false, message: 'Missing customerId' }, { status: 400 });
  
  try {
    const connection = await pool.getConnection();
    try {
      const [rows]: any = await connection.execute('SELECT name, grade FROM customers WHERE id = ?', [customerId]);
      if (rows.length === 0) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      // name may come back as a Buffer due to charset — convert it
      const rawName = rows[0].name;
      const name = Buffer.isBuffer(rawName) ? rawName.toString('utf8') : (rawName ?? '');
      return NextResponse.json({ success: true, name, grade: rows[0].grade });
    } finally {
      connection.release();
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: 'DB Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { customerId, name } = await req.json();
    if (!customerId || !name) return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    
    const connection = await pool.getConnection();
    try {
      await connection.execute('UPDATE customers SET name = ? WHERE id = ?', [name, customerId]);
      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: 'DB Error' }, { status: 500 });
  }
}
