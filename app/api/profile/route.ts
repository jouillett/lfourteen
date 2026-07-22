import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get('customerId');

  if (!customerId) {
    return NextResponse.json({ success: false, message: 'Missing customerId' }, { status: 400 });
  }

  try {
    const connection = await pool.getConnection();
    try {
      const [rows]: any = await connection.execute(
        'SELECT name, zip_code, address, detail_address, mobile, phone, email FROM customers WHERE id = ?',
        [customerId]
      );
      
      if (rows.length === 0) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }

      const user = rows[0];
      for (const key in user) {
        if (Buffer.isBuffer(user[key])) {
          user[key] = user[key].toString('utf8');
        }
      }

      return NextResponse.json({ success: true, data: user });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database error in GET /api/profile:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { customerId, password, currentPassword, name, zip_code, address, detail_address, mobile, phone, email } = body;

    if (!customerId) {
      return NextResponse.json({ success: false, message: 'Missing customerId' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      const [rows]: any = await connection.execute('SELECT password FROM customers WHERE id = ?', [customerId]);
      if (rows.length === 0) {
        return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
      }
      const dbPassword = rows[0].password ? rows[0].password.toString('utf8') : null;

      if (!currentPassword) {
        return NextResponse.json({ success: false, message: 'wrong_password' });
      }

      const { Blowfish } = require('javascript-blowfish');
      const bf = new Blowfish('yrhan');
      const inputEncrypted = bf.base64Encode(bf.encrypt(currentPassword));

      if (inputEncrypted !== dbPassword) {
        return NextResponse.json({ success: false, message: 'wrong_password' });
      }

      let updateQueries = [];
      let params = [];

      if (password) {
        const { Blowfish } = require('javascript-blowfish');
        const bf = new Blowfish('yrhan');
        const encryptedPassword = bf.base64Encode(bf.encrypt(password));
        updateQueries.push('password = ?');
        params.push(encryptedPassword);
      }

      if (name !== undefined) { updateQueries.push('name = ?'); params.push(name); }
      if (zip_code !== undefined) { updateQueries.push('zip_code = ?'); params.push(zip_code); }
      if (address !== undefined) { updateQueries.push('address = ?'); params.push(address); }
      if (detail_address !== undefined) { updateQueries.push('detail_address = ?'); params.push(detail_address); }
      if (mobile !== undefined) { updateQueries.push('mobile = ?'); params.push(mobile); }
      if (phone !== undefined) { updateQueries.push('phone = ?'); params.push(phone); }
      if (email !== undefined) { updateQueries.push('email = ?'); params.push(email); }
      
      if (updateQueries.length === 0) {
        return NextResponse.json({ success: true, message: 'No fields to update' });
      }

      updateQueries.push('updated_at = NOW()');

      params.push(customerId);

      await connection.execute(
        `UPDATE customers SET ${updateQueries.join(', ')} WHERE id = ?`,
        params
      );

      return NextResponse.json({ success: true, message: 'Profile updated' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database error in PUT /api/profile:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ success: false, message: 'Missing customerId' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Delete all customer_id=login-id from the address table
      await connection.execute('DELETE FROM address WHERE customer_id = ?', [customerId]);
      
      // 2. Delete all customer_id=login-id from the cart_items table
      await connection.execute('DELETE FROM cart_items WHERE customer_id = ?', [customerId]);
      
      // 3. Delete all customer_id=login-id from the my_qna
      await connection.execute('DELETE FROM my_qna WHERE customer_id = ?', [customerId]);
      
      // 4. Find all the records from the orders table where customer_id=login-id
      // repeat Delete all order_id=found_id from the order_items table
      // then Delete all customer_id=login-id from the orders table
      const [orderRows]: any = await connection.execute('SELECT id FROM orders WHERE customer_id = ?', [customerId]);
      for (const row of orderRows) {
        await connection.execute('DELETE FROM order_items WHERE order_id = ?', [row.id]);
      }
      await connection.execute('DELETE FROM orders WHERE customer_id = ?', [customerId]);
      
      // 5. Delete all customer_id=login-id from the points table
      await connection.execute('DELETE FROM points WHERE customer_id = ?', [customerId]);
      
      // 6. Delete all customer_id=login-id from the qna table
      await connection.execute('DELETE FROM qna WHERE customer_id = ?', [customerId]);
      
      // 7. Delete reviews and related accuse records
      const [reviewRows]: any = await connection.execute('SELECT id FROM review WHERE customer_id = ?', [customerId]);
      for (const row of reviewRows) {
        await connection.execute('DELETE FROM accuse WHERE review_id = ?', [row.id]);
      }
      await connection.execute('DELETE FROM review WHERE customer_id = ?', [customerId]);

      // 8. Delete billing and billing_item
      const [billingRows]: any = await connection.execute('SELECT id FROM billing WHERE customer_id = ?', [customerId]);
      for (const row of billingRows) {
        await connection.execute('DELETE FROM billing_item WHERE billing_id = ?', [row.id]);
      }
      await connection.execute('DELETE FROM billing WHERE customer_id = ?', [customerId]);

      // 9. Delete a record customer_id=login-id from the customers table
      await connection.execute('DELETE FROM customers WHERE id = ?', [customerId]);

      await connection.commit();
      return NextResponse.json({ success: true, message: 'Account deleted' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database error in DELETE /api/profile:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
