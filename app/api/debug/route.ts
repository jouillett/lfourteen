import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET() {
  try {
    const connection = await pool.getConnection();
    try {
      const [tables] = await connection.query('SHOW TABLES');
      const [ordersSchema] = await connection.query('DESCRIBE orders');
      let orderItemsSchema = null;
      try {
        const [oi] = await connection.query('DESCRIBE order_items');
        orderItemsSchema = oi;
      } catch (e) {}
      let productsSchema = null;
      try {
        const [p] = await connection.query('DESCRIBE products');
        productsSchema = p;
      } catch (e) {}
      return NextResponse.json({ success: true, ordersSchema, orderItemsSchema, productsSchema });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
