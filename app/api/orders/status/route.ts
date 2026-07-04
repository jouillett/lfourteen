import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();
    if (!id || status === undefined) return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    const connection = await pool.getConnection();
    try {
      await connection.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
