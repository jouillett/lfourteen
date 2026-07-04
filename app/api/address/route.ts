import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customer_id');

  if (!customerId) {
    return NextResponse.json({ success: false, error: 'Customer ID is required' }, { status: 400 });
  }

  try {
    const [rows]: any = await pool.query(
      `SELECT * FROM address WHERE customer_id = ? ORDER BY is_default DESC, written_at DESC LIMIT 1`,
      [customerId]
    );

    if (rows.length > 0) {
      const address = rows[0];
      // Normalize any Buffer objects returned by mysql2 (like BIT or VARBINARY)
      for (const key in address) {
        if (address[key] && typeof address[key] === 'object' && address[key] instanceof Buffer) {
          if (address[key].length === 1) {
            // Likely a BIT(1) or TINYINT
            address[key] = address[key][0];
          } else {
            // Likely a string/VARBINARY
            address[key] = address[key].toString('utf8');
          }
        }
      }
      // Fetch the last delivery message from orders
      let lastDeliveryMessage = '';
      try {
        const [orderRows]: any = await pool.query(
          `SELECT delivery_message FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1`,
          [customerId]
        );
        if (orderRows.length > 0 && orderRows[0].delivery_message) {
          const dm = orderRows[0].delivery_message;
          lastDeliveryMessage = (dm instanceof Buffer) ? dm.toString('utf8') : String(dm);
        }
      } catch (err) {
        console.error('Failed to fetch delivery message:', err);
      }

      return NextResponse.json({ success: true, address, deliveryMessage: lastDeliveryMessage });
    } else {
      return NextResponse.json({ success: false, error: 'No address found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Failed to fetch address:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch address' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customer_id,
      recipient_name,
      recipient_mobile = '',
      recipient_phone = '',
      zip_code,
      address,
      detail_address,
      is_default = 0,
    } = body;

    if (!customer_id || !recipient_name || !zip_code || !address) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (is_default) {
      await pool.query(`UPDATE address SET is_default = 0 WHERE customer_id = ?`, [customer_id]);
    }

    const [result]: any = await pool.query(
      `INSERT INTO address (customer_id, recipient_name, recipient_mobile, recipient_phone, zip_code, address, detail_address, is_default, written_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [customer_id, recipient_name, recipient_mobile, recipient_phone, zip_code, address, detail_address, is_default]
    );

    return NextResponse.json({ success: true, addressId: result.insertId });
  } catch (error) {
    console.error('Failed to save address:', error);
    return NextResponse.json({ success: false, error: 'Failed to save address' }, { status: 500 });
  }
}
