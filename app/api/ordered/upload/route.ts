import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;
    if (!file) {
      return NextResponse.json({ success: false, message: '파일이 없습니다.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.worksheets[0];
    const updates: { order_id: number, tracking: string }[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const tracking = row.values[1]; // 운송장번호
      const orderId = row.values[11]; // 주문번호

      if (tracking && orderId) {
        let trackingStr = String(tracking).trim();
        let orderIdNum = Number(orderId);
        
        if (trackingStr && !isNaN(orderIdNum)) {
          updates.push({ order_id: orderIdNum, tracking: trackingStr });
        }
      }
    });

    if (updates.length === 0) {
      return NextResponse.json({ success: false, message: '업데이트할 운송장 정보가 엑셀에 없습니다.' }, { status: 400 });
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    let updatedCount = 0;
    for (const update of updates) {
      const shipmentStr = `롯데택배|${update.tracking}`;
      
      const res = await fetch(`${baseUrl}/api/anorder`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: update.order_id,
          shipment: shipmentStr,
          status: 1
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          updatedCount++;
        }
      }
    }

    return NextResponse.json({ success: true, message: `총 ${updatedCount}건의 송장번호가 업데이트 되었습니다.` });
  } catch (error: any) {
    console.error('Error uploading excel:', error);
    return NextResponse.json({ success: false, message: '업로드 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
