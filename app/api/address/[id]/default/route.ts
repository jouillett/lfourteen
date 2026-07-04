import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const addressId = params.id;
  const { customer_id } = await request.json();

  if (!customer_id || !addressId) {
    return NextResponse.json({ success: false, error: 'Customer ID and Address ID are required' }, { status: 400 });
  }

  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Reset all addresses to not default
      await connection.query(
        'UPDATE address SET is_default = 0 WHERE customer_id = ?',
        [customer_id]
      );

      // Set the selected address to default
      await connection.query(
        'UPDATE address SET is_default = 1 WHERE id = ? AND customer_id = ?',
        [addressId, customer_id]
      );

      await connection.commit();
      return NextResponse.json({ success: true });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Failed to set default address:', error);
    return NextResponse.json({ success: false, error: 'Failed to set default address' }, { status: 500 });
  }
}
