import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { sendShippingEmail, sendReturnEmail, sendExchangeEmail } from '../../../../lib/email';

const CARRIERS = [
  { id: "kr.cjlogistics", name: "CJ대한통운" },
  { id: "kr.lotte", name: "롯데택배" },
  { id: "kr.hanjin", name: "한진택배" },
  { id: "kr.epost", name: "우체국택배" },
  { id: "kr.logen", name: "로젠택배" },
  { id: "kr.kdexp", name: "경동택배" },
  { id: "kr.daesin", name: "대신택배" },
  { id: "kr.ilyanglogis", name: "일양로지스" },
];

const parseBuffer = (val: any): any => {
  if (Buffer.isBuffer(val)) return val.toString('utf8');
  if (val && val.type === 'Buffer') return Buffer.from(val.data).toString('utf8');
  return val;
};

async function checkDeliveryDone(shipmentString: string): Promise<{ isDone: boolean, deliveredAt: string | null }> {
  if (!shipmentString || !shipmentString.includes('|')) return { isDone: false, deliveredAt: null };

  const [cName, tNum] = shipmentString.split('|');
  const carrierName = cName.trim();
  const trackId = tNum.trim().replace(/[^0-9a-zA-Z]/g, '');

  const found = CARRIERS.find(c => c.name.includes(carrierName) || carrierName.includes(c.name));
  if (!found || !trackId) return { isDone: false, deliveredAt: null };

  try {
    const apiUrl = `https://apis.tracker.delivery/carriers/${found.id}/tracks/${trackId}`;
    const res = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return { isDone: false, deliveredAt: null };
    const data = await res.json();
    
    const isDone = data?.state?.id === 'delivered';
    let deliveredAt = null;
    
    if (isDone && data?.progresses && data.progresses.length > 0) {
      deliveredAt = data.progresses[data.progresses.length - 1].time;
    }
    
    return { isDone, deliveredAt };
  } catch (error) {
    console.error('Error checking delivery:', error);
    return { isDone: false, deliveredAt: null };
  }
}

async function cancelTossPayment(paymentKey: string): Promise<boolean> {
  try {
    const secretKey = process.env.TOSS_SECRET_KEY || 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';
    const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
    const res = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelReason: '반품 완료' }),
    });
    return res.ok;
  } catch (error) {
    console.error('Toss cancel error:', error);
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const connection = await pool.getConnection();
    try {
      // Fetch orders with status 1, 4, 5, or 7 — include fields needed for refund and emails
      const [orders]: any = await connection.execute(`
        SELECT o.id, o.status, o.shipment, o.\`return\`, o.reshipment, o.payment_key, o.total_price, o.customer_id,
               o.order_number, o.order_name, o.created_at, o.receiver_name, o.receiver_address,
               c.name as customer_name, c.email, c.mobile
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.status IN (1, 4, 5, 7)
      `);

      let updatedCount = 0;

      for (const order of orders) {
        const shipmentField = parseBuffer(order.shipment);
        const returnField = parseBuffer(order.return);
        const reshipmentField = parseBuffer(order.reshipment);

        if (order.status === 1 && shipmentField) {
          // Shipment delivered → 배송완료(2)
          const { isDone, deliveredAt } = await checkDeliveryDone(shipmentField);
          if (isDone) {
            if (deliveredAt) {
              const formattedDate = new Date(deliveredAt).toISOString().slice(0, 19).replace('T', ' ');
              await connection.execute('UPDATE orders SET status = 2, received_at = ? WHERE id = ?', [formattedDate, order.id]);
            } else {
              await connection.execute('UPDATE orders SET status = 2, received_at = NOW() WHERE id = ?', [order.id]);
            }
            updatedCount++;

            // Send mail2.html
            if (order.email) {
              const [imgRows]: any = await connection.execute('SELECT p.image FROM products p JOIN order_items oi ON p.id = oi.product_id WHERE oi.order_id = ? LIMIT 1', [order.id]);
              let productImage = '';
              if (imgRows.length > 0) {
                productImage = Buffer.isBuffer(imgRows[0].image) ? imgRows[0].image.toString('utf8') : imgRows[0].image;
              }
              const parts = shipmentField.split('|');
              const now = new Date();
              const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
              
              const formatReceiverName = (name: string) => (!name || name.length <= 1) ? (name||'') : name[0] + '*' + name[name.length - 1];
              const formatMobile = (mobile: string) => {
                if (!mobile) return '';
                const parts = mobile.split('-');
                return parts.length === 3 ? `${parts[0]}-****-${parts[2]}` : mobile;
              };
              const formatAddress = (address: string) => {
                if (!address) return '';
                const idx = address.indexOf('] ');
                let addr = idx !== -1 ? address.substring(idx + 2) : address;
                return addr.trim().split(/\s+/).slice(0, 2).join(' ');
              };

              try {
                await sendShippingEmail(order.email, {
                  customerName: parseBuffer(order.customer_name),
                  now: nowStr,
                  createdAt: new Date(order.created_at).toISOString().split('T')[0],
                  orderNumber: parseBuffer(order.order_number),
                  productImage,
                  productName: parseBuffer(order.order_name),
                  price: order.total_price ? Number(parseBuffer(order.total_price)).toLocaleString() : '0',
                  shipmentCompany: parts[0] || '',
                  shipmentNumber: parts[1] || '',
                  receiverName: formatReceiverName(parseBuffer(order.receiver_name)),
                  receiverPhone: formatMobile(parseBuffer(order.mobile)),
                  receiveAddress: formatAddress(parseBuffer(order.receiver_address))
                });
              } catch (e) { console.error('Failed to send shipping email in cron:', e); }
            }
          }

        } else if (order.status === 4 && returnField) {
          // Return parcel received → 교환진행(5)
          const { isDone } = await checkDeliveryDone(returnField);
          if (isDone) {
            await connection.execute('UPDATE orders SET status = 5 WHERE id = ?', [order.id]);
            updatedCount++;
          }

        } else if (order.status === 5 && reshipmentField) {
          // Re-shipment delivered → 교환완료(6)
          const { isDone, deliveredAt } = await checkDeliveryDone(reshipmentField);
          if (isDone) {
            if (deliveredAt) {
              const formattedDate = new Date(deliveredAt).toISOString().slice(0, 19).replace('T', ' ');
              await connection.execute('UPDATE orders SET status = 6, received_at = ? WHERE id = ?', [formattedDate, order.id]);
            } else {
              await connection.execute('UPDATE orders SET status = 6, received_at = NOW() WHERE id = ?', [order.id]);
            }
            updatedCount++;

            // Send mail4.html
            if (order.email) {
              const [imgRows]: any = await connection.execute('SELECT p.image FROM products p JOIN order_items oi ON p.id = oi.product_id WHERE oi.order_id = ? LIMIT 1', [order.id]);
              let productImage = '';
              if (imgRows.length > 0) {
                productImage = Buffer.isBuffer(imgRows[0].image) ? imgRows[0].image.toString('utf8') : imgRows[0].image;
              }
              try {
                await sendExchangeEmail(order.email, {
                  customerName: parseBuffer(order.customer_name),
                  orderNumber: parseBuffer(order.order_number),
                  createdAt: new Date(order.created_at).toISOString().split('T')[0],
                  productImage,
                  productName: parseBuffer(order.order_name),
                  price: order.total_price ? Number(parseBuffer(order.total_price)).toLocaleString() : '0',
                });
              } catch (e) { console.error('Failed to send exchange email in cron:', e); }
            }
          }

        } else if (order.status === 7 && returnField) {
          // Return parcel received → process Toss refund + DB updates → 반품완료(8)
          const { isDone, deliveredAt } = await checkDeliveryDone(returnField);
          if (isDone) {
            const paymentKey = parseBuffer(order.payment_key);
            const actualTotalPrice = Number(parseBuffer(order.total_price)) || 0;
            const customerId = parseBuffer(order.customer_id);
            const amount = Math.round(actualTotalPrice * 0.001);

            // Step 1: Toss payment cancel
            const tossOk = await cancelTossPayment(paymentKey);
            if (!tossOk) {
              console.error(`[check-delivery] Toss cancel failed for order ${order.id}`);
              continue; // skip, will retry on next cron run
            }

            // Step 2-4: DB updates in a transaction
            await connection.beginTransaction();
            try {
              // Deduct from points table (oldest record for this customer)
              const [points]: any = await connection.execute(
                'SELECT * FROM points WHERE customer_id = ? ORDER BY created_at ASC LIMIT 1',
                [customerId]
              );
              if (points.length > 0) {
                await connection.execute(
                  'UPDATE points SET point_amount = point_amount - ? WHERE id = ?',
                  [amount, points[0].id]
                );
              }

              // Update customer point
              await connection.execute(
                'UPDATE customers SET point = GREATEST(0, point - ?) WHERE id = ?',
                [amount, customerId]
              );

              // Set order status to 8 (반품완료)
              if (deliveredAt) {
                const formattedDate = new Date(deliveredAt).toISOString().slice(0, 19).replace('T', ' ');
                await connection.execute('UPDATE orders SET status = 8, received_at = ? WHERE id = ?', [formattedDate, order.id]);
              } else {
                await connection.execute('UPDATE orders SET status = 8, received_at = NOW() WHERE id = ?', [order.id]);
              }

              await connection.commit();
              updatedCount++;
              console.log(`[check-delivery] Order ${order.id} refunded and set to status 8`);

              // Send mail3.html
              if (order.email) {
                const [imgRows]: any = await connection.execute('SELECT p.image FROM products p JOIN order_items oi ON p.id = oi.product_id WHERE oi.order_id = ? LIMIT 1', [order.id]);
                let productImage = '';
                if (imgRows.length > 0) {
                  productImage = Buffer.isBuffer(imgRows[0].image) ? imgRows[0].image.toString('utf8') : imgRows[0].image;
                }
                try {
                  await sendReturnEmail(order.email, {
                    customerName: parseBuffer(order.customer_name),
                    orderNumber: parseBuffer(order.order_number),
                    createdAt: new Date(order.created_at).toISOString().split('T')[0],
                    productImage,
                    productName: parseBuffer(order.order_name),
                    price: order.total_price ? Number(parseBuffer(order.total_price)).toLocaleString() : '0',
                  });
                } catch (e) { console.error('Failed to send return email in cron:', e); }
              }

            } catch (dbErr) {
              await connection.rollback();
              console.error(`[check-delivery] DB error for order ${order.id}:`, dbErr);
            }
          }
        }
      }

      return NextResponse.json({ success: true, updatedCount });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Check delivery cron error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
