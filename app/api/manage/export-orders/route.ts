import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import * as xlsx from 'xlsx';
import path from 'path';

export async function GET(req: Request) {
  const connection = await pool.getConnection();
  try {
    const [rows]: any = await connection.execute(`
      SELECT 
        o.id as order_id, 
        p.name as product_name, 
        (oi.quantity * pr.quantity) as total_qty, 
        (oi.quantity * pr.price) as total_price, 
        o.created_at, 
        o.receiver_name, 
        o.receiver_mobile, 
        o.receiver_phone, 
        o.receiver_address,
        o.delivery_message
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN prices pr ON oi.price_id = pr.id
      WHERE o.status = 0
      ORDER BY o.created_at DESC
    `);
    
    const fs = require('fs');
    const designDir = path.join(process.cwd(), 'design');
    const templateFileName = fs.readdirSync(designDir).find((f: string) => f.includes('.xlsx'));
    const templatePath = path.join(designDir, templateFileName);
    const fileBuffer = fs.readFileSync(templatePath);
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const parseBuffer = (val: any) => {
      if (val === null || val === undefined) return '';
      if (Buffer.isBuffer(val)) return val.toString('utf8');
      if (val && val.type === 'Buffer') return Buffer.from(val.data).toString('utf8');
      return String(val);
    };

    const dataToAdd = rows.map((row: any) => {
       const dt = new Date(row.created_at);
       const dateStr = dt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
       
       const fullAddress = parseBuffer(row.receiver_address);

       return [
         parseBuffer(row.order_id),
         parseBuffer(row.product_name),
         Number(row.total_qty) || 0,
         Number(row.total_price) || 0,
         dateStr,
         "", // 송장번호
         "", // 반품송장번호
         parseBuffer(row.receiver_name),
         parseBuffer(row.receiver_mobile),
         parseBuffer(row.receiver_phone),
         fullAddress,
         parseBuffer(row.delivery_message),
         "" // 메모
       ];
    });

    xlsx.utils.sheet_add_aoa(worksheet, dataToAdd, { origin: "A2" });

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="orders.xlsx"'
      }
    });

  } catch (error) {
    console.error('Export Error:', error);
    return NextResponse.json({ success: false, message: 'Export failed' }, { status: 500 });
  } finally {
    connection.release();
  }
}
