import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET() {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query('ALTER TABLE review ADD COLUMN order_id INT');
      return NextResponse.json({ success: true, message: 'Added order_id' });
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        return NextResponse.json({ success: true, message: 'order_id already exists' });
      }
      return NextResponse.json({ success: false, error: e.message });
    } finally {
      connection.release();
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'DB Connection Error' });
  }
}
