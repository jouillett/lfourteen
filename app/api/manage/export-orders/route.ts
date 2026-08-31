import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

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
    
    const designDir = path.join(process.cwd(), 'design');
    const templateFileName = fs.readdirSync(designDir).find((f: string) => f.includes('.xlsx'));
    const templatePath = path.join(designDir, templateFileName!);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];

    const parseBuffer = (val: any) => {
      if (val === null || val === undefined) return '';
      if (Buffer.isBuffer(val)) return val.toString('utf8');
      if (val && val.type === 'Buffer') return Buffer.from(val.data).toString('utf8');
      return String(val);
    };

    // Template's 2nd row has the styles (colors, fonts, etc.)
    const styleRow = worksheet.getRow(2);

    rows.forEach((row: any, index: number) => {
       const dt = new Date(row.created_at);
       const formatter = new Intl.DateTimeFormat('ko-KR', {
         timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true
       });
       let dateStr = formatter.format(dt);
       dateStr = dateStr.replace('AM', '오전').replace('PM', '오후');
       
       const fullAddress = parseBuffer(row.receiver_address);
       const priceVal = (Number(row.total_qty) || 0) * 30000;
       const priceStr = priceVal.toLocaleString() + '원';

       const rowData = [
         parseBuffer(row.order_id),
         parseBuffer(row.product_name),
         Number(row.total_qty) || 0,
         priceStr,
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

       const newRow = worksheet.insertRow(2 + index, rowData);
       
       // Apply style from the template's first data row
       newRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
         const styleCell = styleRow.getCell(colNumber);
         cell.style = styleCell.style;
       });
       newRow.commit();
    });

    // Remove the original blank styled template row which was shifted down
    if (rows.length > 0) {
      worksheet.spliceRows(2 + rows.length, 1);
    }

    const buffer = await workbook.xlsx.writeBuffer();

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
