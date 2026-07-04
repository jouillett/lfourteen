import { NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ success: false, message: 'Missing customerId' }, { status: 400 });
    }

    const query = `
      SELECT 
        '상품문의' AS inquiry_type,
        q.id,
        q.product_id,
        p.name AS product_name,
        q.order_id,
        o.created_at AS order_date,
        q.is_secret,
        q.content,
        q.written_at,
        q.is_answer,
        q.answer_content,
        q.answer_date
      FROM qna q
      LEFT JOIN products p ON q.product_id = p.id
      LEFT JOIN orders o ON q.order_id = o.id
      WHERE q.customer_id = ?

      UNION ALL

      SELECT 
        '1:1 문의' AS inquiry_type,
        mq.id,
        mq.product_id,
        p.name AS product_name,
        mq.order_id,
        o.created_at AS order_date,
        NULL AS is_secret,
        mq.content,
        mq.written_at,
        mq.is_answer,
        mq.answer_content,
        mq.answer_date
      FROM my_qna mq
      LEFT JOIN products p ON mq.product_id = p.id
      LEFT JOIN orders o ON mq.order_id = o.id
      WHERE mq.customer_id = ?

      ORDER BY written_at DESC
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [customerId, customerId]);

    const parseBuffer = (val: any) => {
      if (!val) return val;
      if (Buffer.isBuffer(val)) return val.toString('utf8');
      if (typeof val === 'object' && val.type === 'Buffer' && Array.isArray(val.data)) {
        return Buffer.from(val.data).toString('utf8');
      }
      return val;
    };

    const data = rows.map(r => {
      return {
        ...r,
        inquiry_type: parseBuffer(r.inquiry_type),
        content: parseBuffer(r.content),
        answer_content: parseBuffer(r.answer_content),
        product_name: parseBuffer(r.product_name),
        is_answer: !!r.is_answer
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Fetch my-inquiries error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
