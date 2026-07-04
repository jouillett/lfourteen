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
      `SELECT * FROM address WHERE customer_id = ? ORDER BY is_default DESC, written_at DESC`,
      [customerId]
    );

    // Normalize buffers
    const addresses = rows.map((address: any) => {
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

    return NextResponse.json({ success: true, addresses });
  } catch (error) {
    console.error('Failed to fetch addresses:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch addresses' }, { status: 500 });
  }
}
