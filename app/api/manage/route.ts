import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET(req: Request) {
  try {
    const connection = await pool.getConnection();
    try {
      const [accuseRows]: any = await connection.query('SELECT * FROM accuse ORDER BY created_at DESC');
      const processedAccuse = accuseRows.map((item: any) => {
        const pItem = { ...item };
        for (const key in pItem) {
          if (Buffer.isBuffer(pItem[key])) {
            pItem[key] = pItem[key].toString('utf8');
          } else if (pItem[key] && pItem[key].type === 'Buffer') {
            pItem[key] = Buffer.from(pItem[key].data).toString('utf8');
          }
        }
        return pItem;
      });

      const [orderRows]: any = await connection.query('SELECT * FROM orders WHERE status IN (0, 4, 5, 7) ORDER BY created_at DESC');
      const processedOrders = orderRows.map((item: any) => {
        const pItem = { ...item };
        for (const key in pItem) {
          if (Buffer.isBuffer(pItem[key])) {
            pItem[key] = pItem[key].toString('utf8');
          } else if (pItem[key] && pItem[key].type === 'Buffer') {
            pItem[key] = Buffer.from(pItem[key].data).toString('utf8');
          }
        }
        return pItem;
      });

      const [qnaRows]: any = await connection.query('SELECT *, "qna" as source_table FROM qna WHERE is_answer=0');
      const [myQnaRows]: any = await connection.query('SELECT *, "my_qna" as source_table FROM my_qna WHERE is_answer=0');
      const allQna = [...qnaRows, ...myQnaRows].sort((a, b) => new Date(b.written_at).getTime() - new Date(a.written_at).getTime());
      
      const processedQna = allQna.map((item: any) => {
        const pItem = { ...item };
        for (const key in pItem) {
          if (Buffer.isBuffer(pItem[key])) {
            pItem[key] = pItem[key].toString('utf8');
          } else if (pItem[key] && pItem[key].type === 'Buffer') {
            pItem[key] = Buffer.from(pItem[key].data).toString('utf8');
          }
        }
        return pItem;
      });

      return NextResponse.json({ success: true, accuses: processedAccuse, orders: processedOrders, qnas: processedQna });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Database error in GET /api/manage:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
