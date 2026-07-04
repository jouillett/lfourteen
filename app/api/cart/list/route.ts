import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Missing userId' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT 
          c.id as cart_item_id,
          c.product_id,
          c.quantity as cart_quantity,
          p.image,
          p.name as description,
          pr.quantity as priced_quantity_val,
          pr.price
        FROM cart_items c
        JOIN products p ON c.product_id = p.id
        JOIN prices pr ON c.priced_id = pr.id
        WHERE c.customer_id = ?
      `;
      const [rows] = await connection.execute<RowDataPacket[]>(query, [userId]);

      const items = rows.map(row => {
        const imageStr = Buffer.isBuffer(row.image) ? row.image.toString('utf8') : row.image;
        const descStr = Buffer.isBuffer(row.description) ? row.description.toString('utf8') : row.description;
        
        return {
          cart_item_id: row.cart_item_id,
          product_id: row.product_id,
          price: row.price,
          cart_quantity: row.cart_quantity,
          image: imageStr,
          description: descStr,
          priced_quantity: row.priced_quantity_val + "개"
        };
      });

      return NextResponse.json({ success: true, items });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Fetch cart error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
