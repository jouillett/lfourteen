import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const addressId = params.id;
  const { customer_id } = await request.json();

  if (!customer_id || !addressId) {
    return NextResponse.json({ success: false, error: 'Customer ID and Address ID are required' }, { status: 400 });
  }

  try {
    await pool.query(
      'DELETE FROM address WHERE id = ? AND customer_id = ?',
      [addressId, customer_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete address:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete address' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const addressId = params.id;
  const body = await request.json();
  const {
    customer_id,
    recipient_name,
    recipient_mobile,
    recipient_phone,
    zip_code,
    address,
    detail_address,
    is_default
  } = body;

  if (!customer_id || !addressId || !recipient_name || !zip_code || !address) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

  try {
    if (is_default) {
      await pool.query(`UPDATE address SET is_default = 0 WHERE customer_id = ?`, [customer_id]);
    }

    await pool.query(
      `UPDATE address SET 
        recipient_name = ?, 
        recipient_mobile = ?, 
        recipient_phone = ?, 
        zip_code = ?, 
        address = ?, 
        detail_address = ?, 
        is_default = ?
       WHERE id = ? AND customer_id = ?`,
      [
        recipient_name,
        recipient_mobile || '',
        recipient_phone || '',
        zip_code,
        address,
        detail_address || '',
        is_default ? 1 : 0,
        addressId,
        customer_id
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update address:', error);
    return NextResponse.json({ success: false, error: 'Failed to update address' }, { status: 500 });
  }
}
