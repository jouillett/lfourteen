import { NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { sendShippingEmail, sendReturnEmail, sendExchangeEmail } from '../../../lib/email';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing order id' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT o.id, o.order_number, o.order_name, o.customer_id, c.name as customer_name, 
               o.total_price, o.status, o.shipment, o.\`return\`, o.reshipment, o.created_at
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.id = ?
      `;
      const [rows]: any = await connection.query(query, [id]);

      if (rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
      }

      const order = { ...rows[0] };
      // Parse buffers to strings
      for (const key in order) {
        if (Buffer.isBuffer(order[key])) {
          order[key] = order[key].toString('utf8');
        } else if (order[key] && order[key].type === 'Buffer') {
          order[key] = Buffer.from(order[key].data).toString('utf8');
        }
      }

      return NextResponse.json({ success: true, order });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Database error in GET /api/anorder:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

  export async function PATCH(req: Request) {
    try {
      const { id, shipment, return: returnTracking, reshipment, status } = await req.json();
  
      if (!id) {
        return NextResponse.json({ success: false, message: 'Missing order id' }, { status: 400 });
      }
  
      const connection = await pool.getConnection();
      try {
        let finalStatus = status !== undefined ? Number(status) : null;
        if (shipment && shipment.includes('|') && finalStatus === 0) {
          finalStatus = 1;
        }

        // Check if we are changing to 3 or 8 from a different status
        const [currRows]: any = await connection.execute('SELECT status, payment_key, total_price, customer_id FROM orders WHERE id = ?', [id]);
        if (currRows.length === 0) return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        
        const currentOrder = currRows[0];
        const isCanceling = (finalStatus === 3 || finalStatus === 8) && currentOrder.status !== 3 && currentOrder.status !== 8;

        if (isCanceling) {
          // Parse buffers
          const paymentKey = Buffer.isBuffer(currentOrder.payment_key) ? currentOrder.payment_key.toString('utf8') : currentOrder.payment_key;
          const actualTotalPrice = Number(Buffer.isBuffer(currentOrder.total_price) ? currentOrder.total_price.toString('utf8') : currentOrder.total_price) || 0;
          const customerId = Buffer.isBuffer(currentOrder.customer_id) ? currentOrder.customer_id.toString('utf8') : currentOrder.customer_id;
          
          if (paymentKey) {
            const secretKey = process.env.TOSS_SECRET_KEY || 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';
            const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
            const tossRes = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
              method: 'POST',
              headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
              body: JSON.stringify({ cancelReason: finalStatus === 3 ? '관리자 취소' : '관리자 반품 완료' }),
            });

            if (!tossRes.ok) {
              const errData = await tossRes.json();
              // If already canceled, Toss returns a specific error we could ignore, but let's log it
              console.error(`Toss cancel failed for order ${id}:`, errData);
              // Only fail if it's a critical error, otherwise proceed
              if (errData.code !== 'ALREADY_CANCELED_PAYMENT') {
                return NextResponse.json({ success: false, message: '토스 결제 취소에 실패했습니다: ' + (errData.message || 'Unknown') }, { status: 400 });
              }
            }
          }

          if (customerId) {
            const amount = Math.round(actualTotalPrice * 0.001);
            await connection.beginTransaction();
            try {
              const [points]: any = await connection.execute(
                'SELECT id FROM points WHERE customer_id = ? ORDER BY created_at ASC LIMIT 1',
                [customerId]
              );
              if (points.length > 0) {
                await connection.execute('UPDATE points SET point_amount = point_amount - ? WHERE id = ?', [amount, points[0].id]);
              }
              await connection.execute(
                'UPDATE customers SET point = GREATEST(0, point - ?), total_spent = GREATEST(0, total_spent - ?) WHERE id = ?',
                [amount, actualTotalPrice, customerId]
              );
              await connection.commit();
            } catch (err) {
              await connection.rollback();
              console.error('Failed to update points/spent during cancellation:', err);
            }
          }
        }

        await connection.execute(
          'UPDATE orders SET shipment = ?, `return` = ?, reshipment = ?, status = ? WHERE id = ?',
          [shipment || null, returnTracking || null, reshipment || null, finalStatus, id]
        );

        if (finalStatus === 1 && shipment && shipment.includes('|')) {
          const query = `
            SELECT o.id, o.order_number, o.order_name, o.total_price, o.created_at, o.receiver_name, o.receiver_address,
                   c.name as customer_name, c.email, c.mobile
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
          `;
          const [rows]: any = await connection.execute(query, [id]);
          if (rows.length > 0 && rows[0].email) {
            const orderInfo = rows[0];
            
            const [imageRows]: any = await connection.execute(
              `SELECT p.image FROM products p JOIN order_items oi ON p.id = oi.product_id WHERE oi.order_id = ? LIMIT 1`,
              [id]
            );
            
            let productImage = '';
            if (imageRows.length > 0) {
              productImage = Buffer.isBuffer(imageRows[0].image) ? imageRows[0].image.toString('utf8') : imageRows[0].image;
            }

            const formatReceiverName = (name: string) => {
              if (!name) return '';
              if (name.length <= 1) return name;
              return name[0] + '*' + name[name.length - 1];
            };

            const formatMobile = (mobile: string) => {
              if (!mobile) return '';
              const parts = mobile.split('-');
              if (parts.length === 3) {
                return `${parts[0]}-****-${parts[2]}`;
              }
              return mobile;
            };

            const formatAddress = (address: string) => {
              if (!address) return '';
              const idx = address.indexOf('] ');
              let addr = idx !== -1 ? address.substring(idx + 2) : address;
              const words = addr.trim().split(/\s+/);
              return words.slice(0, 2).join(' ');
            };

            const parts = shipment.split('|');
            const now = new Date();
            const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            const createdStr = new Date(orderInfo.created_at).toISOString().split('T')[0];

            try {
              await sendShippingEmail(orderInfo.email, {
                customerName: orderInfo.customer_name,
                now: nowStr,
                createdAt: createdStr,
                orderNumber: orderInfo.order_number,
                productImage: productImage,
                productName: orderInfo.order_name,
                price: orderInfo.total_price ? Number(orderInfo.total_price).toLocaleString() : '0',
                shipmentCompany: parts[0] || '',
                shipmentNumber: parts[1] || '',
                receiverName: formatReceiverName(orderInfo.receiver_name),
                receiverPhone: formatMobile(orderInfo.mobile),
                receiveAddress: formatAddress(orderInfo.receiver_address)
              });
              console.log(`Shipping email sent to: ${orderInfo.email}`);
            } catch (emailErr) {
              console.error('Failed to send shipping email:', emailErr);
            }
          }
        }

        // Return completion email: status 8 (반품완료)
        if (finalStatus === 8) {
          const query = `
            SELECT o.id, o.order_number, o.order_name, o.total_price, o.created_at,
                   c.name as customer_name, c.email
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
          `;
          const [rows]: any = await connection.execute(query, [id]);
          if (rows.length > 0 && rows[0].email) {
            const orderInfo = rows[0];

            const [imageRows]: any = await connection.execute(
              `SELECT p.image FROM products p JOIN order_items oi ON p.id = oi.product_id WHERE oi.order_id = ? LIMIT 1`,
              [id]
            );

            let productImage = '';
            if (imageRows.length > 0) {
              productImage = Buffer.isBuffer(imageRows[0].image) ? imageRows[0].image.toString('utf8') : imageRows[0].image;
            }

            const createdStr = new Date(orderInfo.created_at).toISOString().split('T')[0];

            try {
              await sendReturnEmail(orderInfo.email, {
                customerName: orderInfo.customer_name,
                orderNumber: orderInfo.order_number,
                createdAt: createdStr,
                productImage: productImage,
                productName: orderInfo.order_name,
                price: orderInfo.total_price ? Number(orderInfo.total_price).toLocaleString() : '0',
              });
              console.log(`Return email sent to: ${orderInfo.email}`);
            } catch (emailErr) {
              console.error('Failed to send return email:', emailErr);
            }
          }
        }

        // Exchange completion email: status 6 (교환완료)
        if (finalStatus === 6) {
          const query = `
            SELECT o.id, o.order_number, o.order_name, o.total_price, o.created_at,
                   c.name as customer_name, c.email
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
          `;
          const [rows]: any = await connection.execute(query, [id]);
          if (rows.length > 0 && rows[0].email) {
            const orderInfo = rows[0];

            const [imageRows]: any = await connection.execute(
              `SELECT p.image FROM products p JOIN order_items oi ON p.id = oi.product_id WHERE oi.order_id = ? LIMIT 1`,
              [id]
            );

            let productImage = '';
            if (imageRows.length > 0) {
              productImage = Buffer.isBuffer(imageRows[0].image) ? imageRows[0].image.toString('utf8') : imageRows[0].image;
            }

            const createdStr = new Date(orderInfo.created_at).toISOString().split('T')[0];

            try {
              await sendExchangeEmail(orderInfo.email, {
                customerName: orderInfo.customer_name,
                orderNumber: orderInfo.order_number,
                createdAt: createdStr,
                productImage: productImage,
                productName: orderInfo.order_name,
                price: orderInfo.total_price ? Number(orderInfo.total_price).toLocaleString() : '0',
              });
              console.log(`Exchange email sent to: ${orderInfo.email}`);
            } catch (emailErr) {
              console.error('Failed to send exchange email:', emailErr);
            }
          }
        }

      return NextResponse.json({ success: true, message: 'Order updated successfully' });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Database error in PATCH /api/anorder:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
