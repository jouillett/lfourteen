import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // 'qna' or 'my_qna'

    if (!id || !type) {
      return NextResponse.json({ success: false, message: 'Missing id or type' }, { status: 400 });
    }

    if (type !== 'qna' && type !== 'my_qna') {
      return NextResponse.json({ success: false, message: 'Invalid type' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT q.id, q.product_id, p.name as product_name, q.order_id, q.content, q.written_at, q.answer_content
        FROM ${type} q
        LEFT JOIN products p ON q.product_id = p.id
        WHERE q.id = ?
      `;
      const [rows]: any = await connection.query(query, [id]);

      if (rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Inquiry not found' }, { status: 404 });
      }

      const inquiry = { ...rows[0] };
      // Parse buffers to strings
      for (const key in inquiry) {
        if (Buffer.isBuffer(inquiry[key])) {
          inquiry[key] = inquiry[key].toString('utf8');
        } else if (inquiry[key] && inquiry[key].type === 'Buffer') {
          inquiry[key] = Buffer.from(inquiry[key].data).toString('utf8');
        }
      }

      return NextResponse.json({ success: true, inquiry });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error(`Database error in GET /api/answer:`, error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, type, answer_content } = await req.json();

    if (!id || !type) {
      return NextResponse.json({ success: false, message: 'Missing id or type' }, { status: 400 });
    }

    if (type !== 'qna' && type !== 'my_qna') {
      return NextResponse.json({ success: false, message: 'Invalid type' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      const query = `UPDATE ${type} SET answer_content = ?, is_answer = 1, answer_date = NOW() WHERE id = ?`;
      await connection.execute(query, [answer_content || '', id]);
      return NextResponse.json({ success: true, message: 'Answer saved successfully' });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error(`Database error in PATCH /api/answer:`, error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
