import { NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const [reviewRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM review');
    const [qnaRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM qna');

    return NextResponse.json({
      reviewCount: reviewRows[0].count,
      qnaCount: qnaRows[0].count,
    });
  } catch (error: any) {
    console.error('Failed to fetch counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch counts from database' },
      { status: 500 }
    );
  }
}
