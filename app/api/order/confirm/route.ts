import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { RowDataPacket } from '@/lib/db';

export async function POST(req: Request) {
  let connection;
  try {
    const body = await req.json();
    const { paymentKey, orderId, amount, pendingAddress, orderInfo } = body;

    console.log('[confirm] Received:', { paymentKey: !!paymentKey, orderId, amount, hasOrderInfo: !!orderInfo, hasAddress: !!pendingAddress });
    console.log('[confirm] orderInfo:', JSON.stringify(orderInfo));

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ success: false, message: 'Missing payment details' }, { status: 400 });
    }

    // 1. Confirm with Toss Payments
    // 프론트엔드에서 API 개별 연동 키(test_ck_)를 사용했으므로 백엔드도 API 개별 연동 시크릿 키(test_sk_)를 사용해야 합니다.
    const secretKey = process.env.TOSS_API_SECRET_KEY || process.env.TOSS_SECRET_KEY || 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';
    const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');

    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) })
    });

    const payment = await tossRes.json();
    console.log('[confirm] Toss response status:', tossRes.status, 'payment.method:', payment.method, 'payment.code:', payment.code);

    if (!tossRes.ok) {
      // If already processed, skip Toss confirm but still try DB save
      if (payment.code !== 'ALREADY_PROCESSED_PAYMENT') {
        console.error('[confirm] Toss error:', JSON.stringify(payment));
        return NextResponse.json({ success: false, message: 'Toss confirmation failed: ' + (payment.message || payment.code), tossError: payment }, { status: 400 });
      }
      console.log('[confirm] Payment already confirmed, proceeding with DB save');
    }

    connection = await pool.getConnection();

    // Check idempotency: if order already saved, return success
    const orderNum = orderId.replace(/^order_/, '');
    const [existingOrders] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM orders WHERE order_number = ? LIMIT 1',
      [orderNum]
    );
    if ((existingOrders as RowDataPacket[]).length > 0) {
      connection.release();
      console.log('[confirm] Order already saved, returning success');
      return NextResponse.json({ success: true, payment, alreadySaved: true });
    }

    await connection.beginTransaction();

    const customerId = orderInfo?.userId ? Number(orderInfo.userId) : null;
    console.log('[confirm] customerId:', customerId, 'type:', typeof customerId, 'source:', orderInfo?.source);

    // 2. Save Address if manual input tab was used
    if (pendingAddress && customerId) {
      console.log('[confirm] Saving address...');
      
      const cleanRecipientPhone = (pendingAddress.recipientPhone || '').replace(/-/g, '');

      await connection.execute(
        `INSERT INTO address (customer_id, recipient_name, recipient_mobile, recipient_phone, zip_code, address, detail_address, is_default, written_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          customerId,
          pendingAddress.recipientName || '',
          cleanRecipientPhone,
          '',
          pendingAddress.zipCode || '',
          pendingAddress.address || '',
          pendingAddress.detailAddress || '',
          pendingAddress.isDefault ? 1 : 0
        ]
      );
    }

    // Update customer name if address is default and customer name is null
    const rawIsDefault = orderInfo?.isDefault ?? pendingAddress?.isDefault;
    const isOrderDefault = rawIsDefault == 1 || rawIsDefault === true || rawIsDefault === '1' || rawIsDefault === 'true';
    console.log('[confirm] isDefault check:', { rawIsDefault, isOrderDefault, customerId });

    if (isOrderDefault && customerId) {
      const [custRows] = await connection.execute<RowDataPacket[]>(
        'SELECT id, name FROM customers WHERE id = ? LIMIT 1',
        [customerId]
      );
      console.log('[confirm] Customer rows found:', custRows.length, 'current name:', custRows[0]?.name);
      if (custRows.length > 0) {
        const currentName = custRows[0].name;
        const nameIsEmpty = currentName === null || currentName === undefined || String(currentName).trim() === '' || String(currentName).toLowerCase() === 'null';
        const newName = (orderInfo?.receiverName || pendingAddress?.recipientName || '').trim();
        console.log('[confirm] nameIsEmpty:', nameIsEmpty, 'newName:', newName);
        if (nameIsEmpty && newName) {
          const [updateResult]: any = await connection.execute(
            'UPDATE customers SET name = ? WHERE id = ?',
            [newName, customerId]
          );
          console.log('[confirm] Name update affectedRows:', updateResult.affectedRows);
        }
      }
    }

    // 3. Fetch order items
    let itemsToInsert: { product_id: number; price_id: number; quantity: number }[] = [];
    let orderName = '상품';

    if (orderInfo?.source === 'buy') {
      const priceIdNum = Number(orderInfo.priceId);
      const [pRows] = await connection.execute<RowDataPacket[]>('SELECT name FROM products WHERE id = 1');
      if (pRows.length > 0) {
        orderName = Buffer.isBuffer(pRows[0].name) ? pRows[0].name.toString('utf8') : pRows[0].name;
      }
      itemsToInsert = [{ product_id: 1, price_id: priceIdNum, quantity: 1 }];
      console.log('[confirm] buy mode, priceId:', priceIdNum);
    } else if (orderInfo?.source === 'cart' && customerId) {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT c.product_id, c.priced_id as price_id, c.quantity, p.name
         FROM cart_items c JOIN products p ON c.product_id = p.id
         WHERE c.customer_id = ?`,
        [customerId]
      );
      console.log('[confirm] cart mode, items found:', rows.length);
      if (rows.length > 0) {
        const firstName = Buffer.isBuffer(rows[0].name) ? rows[0].name.toString('utf8') : rows[0].name;
        orderName = rows.length === 1 ? firstName : `${firstName} 외 ${rows.length - 1}개`;
        itemsToInsert = rows.map(r => ({ product_id: r.product_id, price_id: r.price_id, quantity: r.quantity }));
      }
    } else if (orderInfo?.source === 'reorder' && orderInfo?.reorderId) {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT oi.product_id, oi.price_id, oi.quantity, p.name
         FROM order_items oi JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [orderInfo.reorderId]
      );
      console.log('[confirm] reorder mode, items found:', rows.length);
      if (rows.length > 0) {
        const firstName = Buffer.isBuffer(rows[0].name) ? rows[0].name.toString('utf8') : rows[0].name;
        orderName = rows.length === 1 ? firstName : `${firstName} 외 ${rows.length - 1}개`;
        itemsToInsert = rows.map(r => ({ product_id: r.product_id, price_id: r.price_id, quantity: r.quantity }));
      }
    }

    console.log('[confirm] orderName:', orderName, 'itemCount:', itemsToInsert.length);

    // 4. Determine payment method
    let paymentMethod = payment.method || payment.type || '카드';
    if (payment.easyPay?.provider) paymentMethod = payment.easyPay.provider;
    if (payment.card && !payment.easyPay) paymentMethod = '카드';
    if (payment.transfer) paymentMethod = '계좌이체';
    if (payment.virtualAccount) paymentMethod = '가상계좌';
    if (payment.mobilePhone) paymentMethod = '휴대폰';
    if (paymentMethod === 'QUICK_TRANSFER') paymentMethod = '퀵계좌이체';

    let memo = '';
    if (payment.virtualAccount) {
      memo = `${payment.virtualAccount.bank} ${payment.virtualAccount.accountNumber} (기한: ${payment.virtualAccount.dueDate})`;
    }

    // 5. Insert into orders
    // 가상계좌/계좌이체는 즉시 입금되지 않으므로 status=99(결제대기)로 저장
    const isPendingPayment = paymentMethod === '가상계좌' || paymentMethod === '계좌이체';
    const initialStatus = isPendingPayment ? 99 : 0;
    console.log('[confirm] Inserting order... paymentMethod:', paymentMethod, 'initialStatus:', initialStatus);
    const [orderResult]: any = await connection.execute(
      `INSERT INTO orders (order_number, order_name, customer_id, memo, total_price, used_point, payment_key, payment_method, status,
        receiver_name, receiver_mobile, receiver_phone, receiver_address, delivery_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNum,
        orderName,
        customerId,
        memo,
        Number(amount),
        Number(orderInfo?.pointUsed) || 0,
        paymentKey,
        paymentMethod,
        initialStatus,
        orderInfo?.receiverName || '',
        (orderInfo?.receiverMobile || '').replace(/-/g, ''),
        (orderInfo?.receiverPhone || '').replace(/-/g, ''),
        orderInfo?.receiverAddress || '',
        orderInfo?.deliveryMessage || ''
      ]
    );
    const insertedOrderId = orderResult.insertId;
    console.log('[confirm] Order inserted, id:', insertedOrderId);

    // Stats are now dynamically calculated

    // 6. Insert order_items
    for (const item of itemsToInsert) {
      await connection.execute(
        'INSERT INTO order_items (order_id, product_id, price_id, quantity) VALUES (?, ?, ?, ?)',
        [insertedOrderId, item.product_id, item.price_id, item.quantity]
      );
    }

    // 7. Delete cart_items if from cart
    if (orderInfo?.source === 'cart' && customerId) {
      await connection.execute('DELETE FROM cart_items WHERE customer_id = ?', [customerId]);
      console.log('[confirm] Cart cleared for customer:', customerId);
    }

    // 7. Deduct Points if used — 가상계좌/계좌이체 대기 주문은 입금 확인 후 차감하지 않음 (크론잡/웹훅에서 처리)
    if (orderInfo?.pointUsed > 0 && customerId && !isPendingPayment) {
      console.log('[confirm] Deducting used points:', orderInfo.pointUsed);
      let pointsToDeduct = Number(orderInfo.pointUsed);
      const [pointRecords]: any = await connection.execute(
        `SELECT id, point_amount FROM points WHERE customer_id = ? ORDER BY expired_at ASC FOR UPDATE`,
        [customerId]
      );
      for (const record of pointRecords) {
        if (pointsToDeduct <= 0) break;
        const available = record.point_amount;
        if (available <= pointsToDeduct) {
          await connection.execute(`DELETE FROM points WHERE id = ?`, [record.id]);
          pointsToDeduct -= available;
        } else {
          await connection.execute(`UPDATE points SET point_amount = point_amount - ? WHERE id = ?`, [pointsToDeduct, record.id]);
          pointsToDeduct = 0;
        }
      }
      await connection.execute(
        `UPDATE customers SET point = GREATEST(0, point - ?) WHERE id = ?`,
        [Number(orderInfo.pointUsed), customerId]
      );
    }

    await connection.commit();
    console.log('[confirm] All done successfully!');
    return NextResponse.json({ success: true, payment });

  } catch (error: any) {
    if (connection) {
      try { await connection.rollback(); } catch(e) {}
    }
    const errMsg = error?.sqlMessage || error?.message || 'Unknown error';
    console.error('[confirm] ERROR:', error?.code, errMsg);
    return NextResponse.json({
      success: false,
      message: errMsg,
      code: error?.code
    }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
