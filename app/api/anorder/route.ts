import { NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { sendShippingEmail, sendReturnEmail, sendExchangeEmail } from '../../../lib/email';
import { sendShipmentAlimtalk, sendReturnAlimtalk } from '../../../lib/alimtalk';

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

        // Check if we are changing to 3 or 8 from a different status, or changing to 2
        const [currRows]: any = await connection.execute('SELECT status, payment_key, total_price, customer_id, used_point, refund_bank, refund_account, refund_holder FROM orders WHERE id = ?', [id]);
        if (currRows.length === 0) return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        
        const currentOrder = currRows[0];
        const oldStatus = Number(currentOrder.status) || 0;
        const isCanceling = (finalStatus === 3 || finalStatus === 8) && oldStatus !== 3 && oldStatus !== 8;
        const isEarningPoints = (finalStatus === 2) && (oldStatus !== 2);

        if (isCanceling) {
          // Parse buffers
          const paymentKey = Buffer.isBuffer(currentOrder.payment_key) ? currentOrder.payment_key.toString('utf8') : currentOrder.payment_key;
          const actualTotalPrice = Number(Buffer.isBuffer(currentOrder.total_price) ? currentOrder.total_price.toString('utf8') : currentOrder.total_price) || 0;
          const customerId = Buffer.isBuffer(currentOrder.customer_id) ? currentOrder.customer_id.toString('utf8') : currentOrder.customer_id;
          const usedPoint = Number(Buffer.isBuffer(currentOrder.used_point) ? currentOrder.used_point.toString('utf8') : currentOrder.used_point) || 0;
          
          if (paymentKey) {
            const secretKey = process.env.TOSS_SECRET_KEY || 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';
            const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
            const refundAmount = finalStatus === 8 ? Math.max(0, actualTotalPrice - 3300) : actualTotalPrice;
            
            const cancelBody: any = {
              cancelReason: finalStatus === 3 ? '관리자 취소' : '관리자 반품 완료',
              cancelAmount: refundAmount
            };

            const parseBuffer = (val: any) => {
              if (Buffer.isBuffer(val)) return val.toString('utf8');
              if (val && val.type === 'Buffer') return Buffer.from(val.data).toString('utf8');
              return val;
            };

            const refundBank = parseBuffer(currentOrder.refund_bank);
            const refundAccount = parseBuffer(currentOrder.refund_account);
            const refundHolder = parseBuffer(currentOrder.refund_holder);

            const paymentMethod = parseBuffer(currentOrder.payment_method);
            if ((paymentMethod === '가상계좌' || paymentMethod === '계좌이체') && refundBank && refundAccount && refundHolder) {
              cancelBody.refundReceiveAccount = {
                bank: refundBank,
                accountNumber: refundAccount,
                holderName: refundHolder
              };
            }

            const secretKeys = [
              process.env.TOSS_API_SECRET_KEY,
              process.env.TOSS_SECRET_KEY,
              'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6',
              'test_sk_E92LAa5PVbNakNYZdRnJV7YmpXyJ'
            ].filter(Boolean);

            let tossSuccess = false;
            let lastErrData: any = null;

            for (const secretKey of new Set(secretKeys)) {
              const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
              const tossRes = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
                method: 'POST',
                headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify(cancelBody),
              });

              if (tossRes.ok) {
                tossSuccess = true;
                break;
              } else {
                const errData = await tossRes.json();
                lastErrData = errData;
                if (errData.code === 'ALREADY_CANCELED_PAYMENT' || errData.code === 'NOT_CANCELABLE_AMOUNT') {
                  tossSuccess = true;
                  break;
                } else if (errData.code === 'FORBIDDEN_REQUEST' || errData.code === 'UNAUTHORIZED_KEY') {
                  continue; // Try next key
                } else {
                  break; // Other error, stop trying
                }
              }
            }

            if (!tossSuccess) {
              console.error(`Toss cancel failed for order ${id}:`, lastErrData);
              return NextResponse.json({ success: false, message: '토스 결제 취소에 실패했습니다: ' + (lastErrData?.message || 'Unknown') }, { status: 400 });
            }
          }

          if (customerId) {
            const amount = Math.round(actualTotalPrice * 0.01);
            await connection.beginTransaction();
            try {
              const pointRecnum = Number(Buffer.isBuffer(currentOrder.point_recnum) ? currentOrder.point_recnum.toString('utf8') : currentOrder.point_recnum) || 0;
              const pointsWereEarned = oldStatus >= 2 && oldStatus !== 99 && pointRecnum > 0;
              
              const [custRows]: any = await connection.execute('SELECT grade FROM customers WHERE id = ?', [customerId]);
              const customerGrade = custRows.length > 0 ? custRows[0].grade : null;
              if (String(customerGrade) !== "8") {
                if (pointsWereEarned) {
                  // Return scenario: points were earned (point_recnum exists)
                  if (usedPoint === 0) {
                    await connection.execute('DELETE FROM points WHERE id = ?', [pointRecnum]);
                  } else {
                    await connection.execute('UPDATE points SET point_amount = ? WHERE id = ?', [usedPoint, pointRecnum]);
                  }
                  
                  // Synchronize customers.point with actual sum from points table
                  const [sumRows]: any = await connection.execute(
                    'SELECT IFNULL(SUM(point_amount), 0) as total FROM points WHERE customer_id = ?',
                    [customerId]
                  );
                  await connection.execute(
                    'UPDATE customers SET point = ? WHERE id = ?',
                    [sumRows[0].total, customerId]
                  );
                } else {
                  // Cancel scenario: points were not earned yet, just refund used points
                  if (usedPoint > 0) {
                    await connection.execute(
                      'INSERT INTO points (customer_id, order_id, point_amount, created_at, expired_at) VALUES (?, 0, ?, NOW(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH))',
                      [customerId, usedPoint]
                    );
                    const [sumRows]: any = await connection.execute(
                      'SELECT IFNULL(SUM(point_amount), 0) as total FROM points WHERE customer_id = ?',
                      [customerId]
                    );
                    await connection.execute(
                      'UPDATE customers SET point = ? WHERE id = ?',
                      [sumRows[0].total, customerId]
                    );
                  }
                }
              }
              await connection.commit();
            } catch (err) {
              await connection.rollback();
              console.error('Failed to update points/spent during cancellation:', err);
            }
          }
        }

        if (isEarningPoints) {
          const actualTotalPrice = Number(Buffer.isBuffer(currentOrder.total_price) ? currentOrder.total_price.toString('utf8') : currentOrder.total_price) || 0;
          const customerId = Buffer.isBuffer(currentOrder.customer_id) ? currentOrder.customer_id.toString('utf8') : currentOrder.customer_id;
          
          if (customerId) {
            const [custRows]: any = await connection.execute('SELECT grade FROM customers WHERE id = ?', [customerId]);
            const customerGrade = custRows.length > 0 ? custRows[0].grade : null;
            if (String(customerGrade) !== "8") {
              const amount = Math.round(actualTotalPrice * 0.01);
              if (amount > 0) {
                await connection.beginTransaction();
                try {
                  // Check if already awarded
                  const [awarded]: any = await connection.execute('SELECT id FROM points WHERE order_id = ?', [id]);
                  let pointId = 0;
                  
                  if (awarded.length === 0) {
                    const [result]: any = await connection.execute(
                      'INSERT INTO points (customer_id, order_id, point_amount, created_at, expired_at) VALUES (?, ?, ?, NOW(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH))',
                      [customerId, id, amount]
                    );
                    pointId = result.insertId;
                    
                    const [sumRows]: any = await connection.execute(
                      'SELECT IFNULL(SUM(point_amount), 0) as total FROM points WHERE customer_id = ?',
                      [customerId]
                    );
                    await connection.execute(
                      'UPDATE customers SET point = ? WHERE id = ?',
                      [sumRows[0].total, customerId]
                    );
                  } else {
                    pointId = awarded[0].id;
                  }
                  
                  if (pointId > 0) {
                    await connection.execute('UPDATE orders SET point_recnum = ? WHERE id = ?', [pointId, id]);
                  }
                  
                  await connection.commit();
                } catch (err) {
                  await connection.rollback();
                  console.error('Failed to reward points during status update:', err);
                }
              }
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
              `SELECT p.image, p.bill_image FROM products p JOIN order_items oi ON p.id = oi.product_id WHERE oi.order_id = ? LIMIT 1`,
              [id]
            );
            
            let productImage = '';
            if (imageRows.length > 0) {
              const isSubscription = orderInfo.order_name && orderInfo.order_name.includes('정기구독');
              if (isSubscription && imageRows[0].bill_image) {
                productImage = Buffer.isBuffer(imageRows[0].bill_image) ? imageRows[0].bill_image.toString('utf8') : imageRows[0].bill_image;
              } else {
                productImage = Buffer.isBuffer(imageRows[0].image) ? imageRows[0].image.toString('utf8') : imageRows[0].image;
              }
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
            const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
            const nowStr = `${kstNow.getUTCFullYear()}-${String(kstNow.getUTCMonth()+1).padStart(2,'0')}-${String(kstNow.getUTCDate()).padStart(2,'0')} ${String(kstNow.getUTCHours()).padStart(2,'0')}:${String(kstNow.getUTCMinutes()).padStart(2,'0')}`;
            const orderDate = new Date(orderInfo.created_at);
            const kstOrderDate = new Date(orderDate.getTime() + 9 * 60 * 60 * 1000);
            const createdStr = `${kstOrderDate.getUTCFullYear()}-${String(kstOrderDate.getUTCMonth()+1).padStart(2,'0')}-${String(kstOrderDate.getUTCDate()).padStart(2,'0')}`;

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

            try {
              if (orderInfo.mobile) {
                await sendShipmentAlimtalk(formatMobile(orderInfo.mobile), {
                  name: formatReceiverName(orderInfo.receiver_name),
                  delivery: parts[0] || '',
                  invoice: parts[1] || ''
                });
                console.log(`Shipping alimtalk sent to: ${orderInfo.mobile}`);
              }
            } catch (alimErr) {
              console.error('Failed to send shipping alimtalk:', alimErr);
            }
          }
        }

        // Return completion email: status 8 (반품완료)
        if (finalStatus === 8) {
          const query = `
            SELECT o.id, o.order_number, o.order_name, o.total_price, o.created_at, o.mobile,
                   c.name as customer_name, c.email
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id = ?
          `;
          const [rows]: any = await connection.execute(query, [id]);
          if (rows.length > 0 && rows[0].email) {
            const orderInfo = rows[0];

            const [imageRows]: any = await connection.execute(
              `SELECT p.image, p.bill_image FROM products p JOIN order_items oi ON p.id = oi.product_id WHERE oi.order_id = ? LIMIT 1`,
              [id]
            );

            let productImage = '';
            if (imageRows.length > 0) {
              const isSubscription = orderInfo.order_name && orderInfo.order_name.includes('정기구독');
              if (isSubscription && imageRows[0].bill_image) {
                productImage = Buffer.isBuffer(imageRows[0].bill_image) ? imageRows[0].bill_image.toString('utf8') : imageRows[0].bill_image;
              } else {
                productImage = Buffer.isBuffer(imageRows[0].image) ? imageRows[0].image.toString('utf8') : imageRows[0].image;
              }
            }

            const orderDate = new Date(orderInfo.created_at);
            const kstOrderDate = new Date(orderDate.getTime() + 9 * 60 * 60 * 1000);
            const createdStr = `${kstOrderDate.getUTCFullYear()}-${String(kstOrderDate.getUTCMonth()+1).padStart(2,'0')}-${String(kstOrderDate.getUTCDate()).padStart(2,'0')}`;

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

            try {
              if (orderInfo.mobile) {
                const formatMobile = (m: any) => {
                  if (!m) return '';
                  let str = Buffer.isBuffer(m) ? m.toString('utf8') : String(m);
                  return str.replace(/[^0-9]/g, '');
                };
                const formatReceiverName = (n: any) => {
                  if (!n) return '';
                  return Buffer.isBuffer(n) ? n.toString('utf8') : String(n);
                };
                
                const rawPrice = orderInfo.total_price ? Number(orderInfo.total_price) : 0;
                const chargeAmt = 3300;
                const refundAmt = Math.max(0, rawPrice - chargeAmt);

                await sendReturnAlimtalk(formatMobile(orderInfo.mobile), {
                  name: formatReceiverName(orderInfo.customer_name),
                  amount: rawPrice.toLocaleString(),
                  charge: chargeAmt.toLocaleString(),
                  refund: refundAmt.toLocaleString()
                }, 'cancel'); // using 'cancel' as default templateCode, user must match it
                console.log(`Return alimtalk sent to: ${orderInfo.mobile}`);
              }
            } catch (alimErr) {
              console.error('Failed to send return alimtalk:', alimErr);
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
              `SELECT p.image, p.bill_image FROM products p JOIN order_items oi ON p.id = oi.product_id WHERE oi.order_id = ? LIMIT 1`,
              [id]
            );

            let productImage = '';
            if (imageRows.length > 0) {
              const isSubscription = orderInfo.order_name && orderInfo.order_name.includes('정기구독');
              if (isSubscription && imageRows[0].bill_image) {
                productImage = Buffer.isBuffer(imageRows[0].bill_image) ? imageRows[0].bill_image.toString('utf8') : imageRows[0].bill_image;
              } else {
                productImage = Buffer.isBuffer(imageRows[0].image) ? imageRows[0].image.toString('utf8') : imageRows[0].image;
              }
            }

            const orderDate = new Date(orderInfo.created_at);
            const kstOrderDate = new Date(orderDate.getTime() + 9 * 60 * 60 * 1000);
            const createdStr = `${kstOrderDate.getUTCFullYear()}-${String(kstOrderDate.getUTCMonth()+1).padStart(2,'0')}-${String(kstOrderDate.getUTCDate()).padStart(2,'0')}`;

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
