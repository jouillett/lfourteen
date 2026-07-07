import { NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { RowDataPacket } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { customer_id, product_id, rating, content } = await req.json();

    if (!customer_id || !product_id || !rating || !content) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Get customer name
      const [customerRows]: any = await connection.execute(
        `SELECT name FROM customers WHERE id = ?`,
        [customer_id]
      );
      
      const customer_name = customerRows.length > 0 ? customerRows[0].name : 'User';

      // 2. Get total number of review table records for focus
      const [countRows]: any = await connection.execute(
        `SELECT COUNT(*) as total FROM review`
      );
      const focusValue = countRows[0].total;

      // 3. Update the oldest unreviewed order for this customer to link with the review
      const [orderRows]: any = await connection.execute(
        `SELECT id FROM orders 
         WHERE customer_id = ? AND (status = 2 OR status = 4) AND is_reviewed = 0 
         ORDER BY created_at ASC LIMIT 1`,
        [customer_id]
      );

      let orderIdToUpdate = null;
      if (orderRows.length > 0) {
        orderIdToUpdate = orderRows[0].id;
        await connection.execute(
          `UPDATE orders SET is_reviewed = 1 WHERE id = ?`,
          [orderIdToUpdate]
        );
      }

      // 4. Insert review record
      const [result]: any = await connection.execute(
        `INSERT INTO review (product_id, customer_id, customer_name, rating, focus, content, created_at, order_id)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [product_id, customer_id, customer_name, rating, focusValue, content, orderIdToUpdate]
      );

      const newId = result.insertId;

      await connection.commit();

      return NextResponse.json({ success: true, message: 'Review added successfully', id: newId });

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    
  } catch (error: any) {
    console.error('Add review error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const customerId = searchParams.get('customerId');
    
    let query = `
      SELECT r.*, p.name as product_name 
      FROM review r
      LEFT JOIN products p ON r.product_id = p.id
      ORDER BY r.created_at DESC
    `;
    let params: any[] = [];
    if (productId) {
       query = `
         SELECT r.*, p.name as product_name 
         FROM review r
         LEFT JOIN products p ON r.product_id = p.id
         WHERE r.product_id = ? 
         ORDER BY r.created_at DESC
       `;
       params.push(productId);
    } else if (customerId) {
       query = `
         SELECT r.*, p.name as product_name 
         FROM review r
         LEFT JOIN products p ON r.product_id = p.id
         WHERE r.customer_id = ? 
         ORDER BY r.created_at DESC
       `;
       params.push(customerId);
    }
    
    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    
    const reviews = rows.map(r => {
      const custName = Buffer.isBuffer(r.customer_name) ? r.customer_name.toString('utf8') : (r.customer_name || 'User');
      const contentStr = Buffer.isBuffer(r.content) ? r.content.toString('utf8') : (r.content || '');
      const prodName = Buffer.isBuffer(r.product_name) ? r.product_name.toString('utf8') : (r.product_name || '엘포틴 코디');
      
      return {
        id: r.id,
        product_id: r.product_id,
        product_name: prodName,
        customer_id: r.customer_id,
        customer_name: custName,
        rating: r.rating,
        focus: r.focus,
        content: contentStr,
        created_at: r.created_at
      };
    });

    return NextResponse.json({ success: true, reviews });
  } catch (error: any) {
    console.error('Fetch reviews error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { review_id, customer_id, rating, content } = await req.json();

    if (!review_id || !customer_id || !rating || !content) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Update review record: writer is the person making the update
      await connection.execute(
        `UPDATE review SET rating = ?, content = ?, writer = ? WHERE id = ?`,
        [rating, content, customer_id, review_id]
      );

      await connection.commit();

      return NextResponse.json({ success: true, message: 'Review updated successfully' });

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    
  } catch (error: any) {
    console.error('Update review error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { review_id } = await req.json();

    if (!review_id) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get the order_id for the review being deleted to restore it
      const [reviewRows]: any = await connection.execute(
        `SELECT order_id FROM review WHERE id = ?`,
        [review_id]
      );

      if (reviewRows.length > 0 && reviewRows[0].order_id) {
         await connection.execute(
           `UPDATE orders SET is_reviewed = 0 WHERE id = ?`,
           [reviewRows[0].order_id]
         );
      }

      await connection.execute(
        `DELETE FROM review WHERE id = ?`,
        [review_id]
      );

      await connection.commit();

      return NextResponse.json({ success: true, message: 'Review deleted successfully' });

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    
  } catch (error: any) {
    console.error('Delete review error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
