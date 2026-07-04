import { NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!customerId) {
      return NextResponse.json({ success: false, message: 'Missing customerId' }, { status: 400 });
    }

    let query = `
      SELECT q.*, c.phone 
      FROM my_qna q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.customer_id = ?
    `;
    const params: any[] = [customerId];

    if (startDate && endDate) {
      query += ` AND DATE(q.written_at) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY q.written_at DESC`;

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    const data = rows.map(r => {
      const contentStr = Buffer.isBuffer(r.content) ? r.content.toString('utf8') : (r.content || '');
      const answerStr = Buffer.isBuffer(r.answer_content) ? r.answer_content.toString('utf8') : (r.answer_content || '');
      
      // Mask phone number
      let maskedPhone = '';
      if (r.phone) {
        const p = Buffer.isBuffer(r.phone) ? r.phone.toString('utf8') : r.phone;
        const parts = p.split('-');
        if (parts.length === 3) {
          maskedPhone = `${parts[0]}-${parts[1].substring(0, 2)}**-${parts[2].substring(0, 1)}***`;
        } else {
          // If not formatted as XXX-XXXX-XXXX, just do a generic mask
          maskedPhone = p.substring(0, p.length - 4) + '****';
        }
      }

      return {
        id: r.id,
        product_id: r.product_id,
        customer_id: r.customer_id,
        order_id: r.order_id,
        content: contentStr,
        created_at: r.written_at,
        is_answer: r.is_answer,
        answer_content: answerStr,
        answer_date: r.answer_date,
        masked_phone: maskedPhone
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Fetch my_qna error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const customerId = searchParams.get('customerId');

    if (!id || !customerId) {
      return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        'DELETE FROM my_qna WHERE id = ? AND customer_id = ?',
        [id, customerId]
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ success: false, message: 'Not found or unauthorized' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete my_qna error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
