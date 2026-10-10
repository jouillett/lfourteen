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
        o.shipment,
        o.order_name,
        p.name as product_name,
        oi.quantity as quantity,
        o.receiver_name, 
        o.receiver_mobile, 
        o.receiver_phone, 
        o.receiver_address,
        o.delivery_message
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.status < 2
      ORDER BY o.receiver_name ASC
    `);
    
    const templatePath = path.join(process.cwd(), 'design', 'company.xlsx');
    const workbook = new ExcelJS.Workbook();
    
    if (fs.existsSync(templatePath)) {
      await workbook.xlsx.readFile(templatePath);
    } else {
      throw new Error("Template file not found");
    }

    const worksheet = workbook.worksheets[0];
    
    // Clear existing rows
    const rowCount = worksheet.rowCount;
    for (let i = rowCount; i >= 1; i--) {
      worksheet.spliceRows(i, 1);
    }

    const parseBuffer = (val: any) => {
      if (val === null || val === undefined) return '';
      if (Buffer.isBuffer(val)) return val.toString('utf8');
      if (val && val.type === 'Buffer') return Buffer.from(val.data).toString('utf8');
      return String(val);
    };

    // Set headers identical to /manage
    worksheet.columns = [
      { header: '운송장 번호', key: 'shipment', width: 20 },
      { header: '품목명', key: 'product_name', width: 40 },
      { header: '가격', key: 'price', width: 15 },
      { header: '수량', key: 'quantity', width: 10 },
      { header: '이름', key: 'receiver_name', width: 15 },
      { header: '휴대폰', key: 'receiver_mobile', width: 20 },
      { header: '전화번호', key: 'receiver_phone', width: 20 },
      { header: '우편번호', key: 'zipcode', width: 15 },
      { header: '주소', key: 'address', width: 60 },
      { header: '배송 메시지', key: 'delivery_message', width: 40 },
    ];

    // Set right alignment for the price column
    worksheet.getColumn('price').alignment = { horizontal: 'right' };

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFE0' } // Light yellow
    };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    let totalSum = 0;

    rows.forEach((row: any) => {
       const fullAddress = parseBuffer(row.receiver_address);
       
       let zipcode = '';
       let cleanAddress = fullAddress;
       const zipMatch = fullAddress.match(/^\[?(\d{5})\]?\s*/);
       if (zipMatch) {
         zipcode = zipMatch[1];
         cleanAddress = fullAddress.replace(zipMatch[0], '');
       }

       const quantity = Number(row.quantity) || 0;
       const priceVal = quantity * 25000;
       totalSum += priceVal;

       worksheet.addRow({
         shipment: parseBuffer(row.shipment),
         product_name: parseBuffer(row.order_name) || parseBuffer(row.product_name),
         price: priceVal.toLocaleString() + '원',
         quantity: quantity,
         receiver_name: parseBuffer(row.receiver_name),
         receiver_mobile: parseBuffer(row.receiver_mobile),
         receiver_phone: parseBuffer(row.receiver_phone),
         zipcode: zipcode,
         address: cleanAddress,
         delivery_message: parseBuffer(row.delivery_message)
       });
    });

    if (rows.length > 0) {
      const totalRow = worksheet.addRow({
        shipment: '합계',
        product_name: '',
        price: totalSum.toLocaleString() + '원',
        quantity: '',
        receiver_name: '',
        receiver_mobile: '',
        receiver_phone: '',
        zipcode: '',
        address: '',
        delivery_message: ''
      });
      totalRow.font = { bold: true };
    }

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
