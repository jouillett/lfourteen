import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const connection = await pool.getConnection();
  try {
    const [rows]: any = await connection.execute(`
      SELECT 
        o.id as order_id, 
        p.name as product_name, 
        (oi.quantity * pr.quantity) as total_qty, 
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
    
    const templatePath = path.join(process.cwd(), 'design', 'company.xlsx');
    const workbook = new ExcelJS.Workbook();
    
    if (fs.existsSync(templatePath)) {
      await workbook.xlsx.readFile(templatePath);
    } else {
      throw new Error("Template file not found");
    }

    const worksheet = workbook.worksheets[0];
    
    // Clear rows starting from row 2
    const rowCount = worksheet.rowCount;
    for (let i = rowCount; i >= 2; i--) {
      worksheet.spliceRows(i, 1);
    }

    // Insert actual data starting from row 2
    let currentRow = 2;
    rows.forEach((row: any) => {
      // Parse address if possible to get postal code. Sometimes address is formatted as "(01234) 서울특별시..." or "[01234]"
      let postalCode = "";
      let fullAddress = row.receiver_address || "";
      const match = fullAddress.match(/^[\[\(](\d{5})[\]\)]\s*(.*)$/);
      if (match) {
        postalCode = match[1];
        fullAddress = match[2];
      }

      worksheet.getRow(currentRow).values = [
        "", // A: 운송장번호 (비워둠)
        row.product_name || "", // B: 품목명
        "", // C: 내품명 (비워둠)
        row.total_qty || 1, // D: 내품수량
        row.receiver_name || "", // E: 이름
        row.receiver_mobile || "", // F: 받는분전화번호
        row.receiver_phone || "", // G: 받는분기타연락처
        postalCode, // H: 받는분우편번호
        fullAddress, // I: 받는분주소
        row.delivery_message || "", // J: 배송메세지
        row.order_id || "", // K: 주문번호
        "" // L: 비고
      ];
      currentRow++;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    // Create a filename with current date (KST)
    const dt = new Date();
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const dateStr = formatter.format(dt).replace(/[^0-9]/g, '');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="company_orders_${dateStr}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    });

  } catch (error) {
    console.error('Error generating ordered excel:', error);
    return new NextResponse('Error generating excel', { status: 500 });
  } finally {
    connection.release();
  }
}
