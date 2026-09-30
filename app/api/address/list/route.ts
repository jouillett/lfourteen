import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customer_id');

  if (!customerId) {
    return NextResponse.json({ success: false, error: 'Customer ID is required' }, { status: 400 });
  }

  try {
    const [rows]: any = await pool.query(
      `SELECT * FROM address WHERE customer_id = ? ORDER BY is_default DESC, written_at DESC`,
      [customerId]
    );

    // Normalize buffers
    let addresses = rows.map((address: any) => {
      for (const key in address) {
        if (address[key] && typeof address[key] === 'object' && address[key] instanceof Buffer) {
          if (address[key].length === 1) {
            address[key] = address[key][0];
          } else {
            address[key] = address[key].toString('utf8');
          }
        }
      }
      return address;
    });

    // Auto-add customer's own profile address if missing
    const [customerRows]: any = await pool.query(
      'SELECT name, mobile, phone, zip_code, address, detail_address FROM customers WHERE id = ?',
      [customerId]
    );

    if (customerRows.length > 0) {
      const customer = customerRows[0];
      const cName = customer.name?.toString('utf8') || '';
      const cMobile = (customer.mobile?.toString('utf8') || '').replace(/-/g, '');
      const cPhone = (customer.phone?.toString('utf8') || '').replace(/-/g, '');
      const cZip = customer.zip_code?.toString('utf8') || '';
      const cAddr = customer.address?.toString('utf8') || '';
      const cDetail = customer.detail_address?.toString('utf8') || '';

      if (cZip && cAddr) {
        // Check if this address or mobile already exists in the list
        const exists = addresses.some((a: any) => {
          const aMobile = (a.recipient_mobile || '').replace(/-/g, '');
          return (cMobile && aMobile === cMobile) || (a.address === cAddr && a.detail_address === cDetail);
        });

        if (!exists) {
          const isDefault = addresses.length === 0 ? 1 : 0;
          const [insertResult]: any = await pool.query(
            `INSERT INTO address (customer_id, recipient_name, recipient_mobile, recipient_phone, zip_code, address, detail_address, is_default, written_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [customerId, cName, cMobile, cPhone, cZip, cAddr, cDetail, isDefault]
          );

          addresses.push({
            id: insertResult.insertId,
            customer_id: customerId,
            recipient_name: cName,
            recipient_mobile: cMobile,
            recipient_phone: cPhone,
            zip_code: cZip,
            address: cAddr,
            detail_address: cDetail,
            is_default: isDefault,
            written_at: new Date().toISOString()
          });

          // Sort again so default is on top
          addresses.sort((a: any, b: any) => b.is_default - a.is_default);
        }
      }
    }

    return NextResponse.json({ success: true, addresses });
  } catch (error) {
    console.error('Failed to fetch addresses:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch addresses' }, { status: 500 });
  }
}
