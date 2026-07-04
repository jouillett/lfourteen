import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const source = searchParams.get('source');
    const priceId = searchParams.get('priceId');
    const orderId = searchParams.get('orderId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Missing userId' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      if (source === 'buy') {
        if (!priceId) {
          return NextResponse.json({ success: false, message: 'Missing priceId for direct buy' }, { status: 400 });
        }

        // Fetch product 1 and the specific price option
        const query = `
          SELECT 
            p.name as product_name,
            p.image,
            pr.quantity as option_quantity_val,
            pr.price
          FROM products p
          CROSS JOIN prices pr
          WHERE p.id = 1 AND pr.id = ?
        `;
        const [rows] = await connection.execute<RowDataPacket[]>(query, [priceId]);

        if (rows.length === 0) {
          return NextResponse.json({ success: false, message: 'Product or price option not found' }, { status: 404 });
        }

        const row = rows[0];
        const imageStr = Buffer.isBuffer(row.image) ? row.image.toString('utf8') : row.image;
        const nameStr = Buffer.isBuffer(row.product_name) ? row.product_name.toString('utf8') : row.product_name;

        const items = [{
          product_name: nameStr,
          option_name: row.option_quantity_val + "개",
          order_quantity: 1, // 'buy' means 1 set of the selected option
          price: row.price,
          image: imageStr
        }];

        return NextResponse.json({ success: true, items });

      } else if (source === 'reorder') {
        if (!orderId) {
          return NextResponse.json({ success: false, message: 'Missing orderId for reorder' }, { status: 400 });
        }

        const query = `
          SELECT 
            oi.quantity as order_quantity,
            p.image,
            p.name as product_name,
            pr.quantity as option_quantity_val,
            pr.price
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          JOIN prices pr ON oi.price_id = pr.id
          WHERE oi.order_id = ?
        `;
        const [rows] = await connection.execute<RowDataPacket[]>(query, [orderId]);

        const items = rows.map(row => {
          const imageStr = Buffer.isBuffer(row.image) ? row.image.toString('utf8') : row.image;
          const nameStr = Buffer.isBuffer(row.product_name) ? row.product_name.toString('utf8') : row.product_name;
          
          return {
            product_name: nameStr,
            option_name: row.option_quantity_val + "개",
            order_quantity: row.order_quantity,
            price: row.price,
            image: imageStr
          };
        });

        return NextResponse.json({ success: true, items });
      } else {
        // Assume source === 'cart'
        const query = `
          SELECT 
            c.quantity as cart_quantity,
            p.image,
            p.name as product_name,
            pr.quantity as option_quantity_val,
            pr.price
          FROM cart_items c
          JOIN products p ON c.product_id = p.id
          JOIN prices pr ON c.priced_id = pr.id
          WHERE c.customer_id = ?
        `;
        const [rows] = await connection.execute<RowDataPacket[]>(query, [userId]);

        const items = rows.map(row => {
          const imageStr = Buffer.isBuffer(row.image) ? row.image.toString('utf8') : row.image;
          const nameStr = Buffer.isBuffer(row.product_name) ? row.product_name.toString('utf8') : row.product_name;
          
          return {
            product_name: nameStr,
            option_name: row.option_quantity_val + "개",
            order_quantity: row.cart_quantity,
            price: row.price,
            image: imageStr
          };
        });

        return NextResponse.json({ success: true, items });
      }
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Fetch order items error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
