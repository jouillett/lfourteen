import { NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { RowDataPacket } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { product_id, customer_id, is_secret, content, inquiry_type, order_id = 0 } = await req.json();
    
    if (!customer_id || !content) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }
    
    const connection = await pool.getConnection();
    try {
      if (inquiry_type === "1:1 문의") {
        await connection.execute(
          'INSERT INTO my_qna (product_id, customer_id, content, order_id) VALUES (?, ?, ?, ?)',
          [product_id, customer_id, content, order_id]
        );
      } else {
        await connection.execute(
          'INSERT INTO qna (product_id, customer_id, is_secret, content, order_id) VALUES (?, ?, ?, ?, ?)',
          [product_id, customer_id, is_secret, content, order_id]
        );
      }
      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('QnA insert error:', error);
    return NextResponse.json({ success: false, message: 'DB Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, product_id, customer_id, is_secret, content, inquiry_type, order_id = 0 } = await req.json();
    
    if (!id || !customer_id || !content) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }
    
    const connection = await pool.getConnection();
    try {
      if (inquiry_type === "1:1 문의") {
        await connection.execute(
          'UPDATE my_qna SET product_id = ?, content = ?, order_id = ? WHERE id = ? AND customer_id = ?',
          [product_id, content, order_id, id, customer_id]
        );
      } else {
        await connection.execute(
          'UPDATE qna SET product_id = ?, is_secret = ?, content = ?, order_id = ? WHERE id = ? AND customer_id = ?',
          [product_id, is_secret, content, order_id, id, customer_id]
        );
      }
      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('QnA update error:', error);
    return NextResponse.json({ success: false, message: 'DB Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    
    let query = `
      SELECT q.*, c.name as author_name 
      FROM qna q
      LEFT JOIN customers c ON q.customer_id = c.id
      ORDER BY q.written_at DESC
    `;
    let params: any[] = [];
    if (productId) {
       query = `
         SELECT q.*, c.name as author_name 
         FROM qna q
         LEFT JOIN customers c ON q.customer_id = c.id
         WHERE q.product_id = ?
         ORDER BY q.written_at DESC
       `;
       params.push(productId);
    }
    
    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    
    const data = rows.map(r => {
      const contentStr = Buffer.isBuffer(r.content) ? r.content.toString('utf8') : (r.content || '');
      const answerStr = Buffer.isBuffer(r.answer_content) ? r.answer_content.toString('utf8') : (r.answer_content || '');
      const authorStr = Buffer.isBuffer(r.author_name) ? r.author_name.toString('utf8') : (r.author_name || 'User');
      
      return {
        id: r.id,
        product_id: r.product_id,
        customer_id: r.customer_id,
        author_name: authorStr,
        is_secret: r.is_secret,
        content: contentStr,
        is_answer: r.is_answer,
        answer_content: answerStr,
        created_at: r.written_at
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Fetch qna error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const customerId = searchParams.get('customerId');
    
    if (!id || !customerId) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }
    
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'DELETE FROM qna WHERE id = ? AND customer_id = ?',
        [id, customerId]
      );
      return NextResponse.json({ success: true });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('QnA delete error:', error);
    return NextResponse.json({ success: false, message: 'DB Error' }, { status: 500 });
  }
}
