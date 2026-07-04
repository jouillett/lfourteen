import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function POST(req: Request) {
  try {
    const { content, review_id } = await req.json();

    if (!content) {
      return NextResponse.json({ success: false, message: 'Missing content' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'INSERT INTO accuse (review_id, content) VALUES (?, ?)',
        [review_id || 0, content]
      );
      return NextResponse.json({ success: true, message: 'Report submitted successfully' });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Database error in /api/accuse:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
