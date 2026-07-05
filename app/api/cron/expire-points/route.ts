import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Optional: check cron secret to prevent unauthorized access
  // const authHeader = req.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  // }

  const connection = await pool.getConnection();
  
  try {
    // Start transaction to ensure atomicity
    await connection.beginTransaction();

    // 1. Find records in points table where expired_at is less than today
    const [expiredPointsRows]: any = await connection.execute(
      'SELECT id, customer_id, point_amount FROM points WHERE expired_at < CURDATE()'
    );

    const N = expiredPointsRows.length;

    if (N > 0) {
      for (let i = 0; i < N; i++) {
        const P = expiredPointsRows[i];

        // 2. Find customer where id = P.customer_id
        const [customerRows]: any = await connection.execute(
          'SELECT id, point FROM customers WHERE id = ? FOR UPDATE',
          [P.customer_id]
        );

        if (customerRows.length > 0) {
          const C = customerRows[0];
          
          // 3. Update C's point field
          const newPointValue = Math.max(0, C.point - P.point_amount); // Prevent negative points just in case
          await connection.execute(
            'UPDATE customers SET point = ? WHERE id = ?',
            [newPointValue, C.id]
          );
        }

        // 4. Delete P record
        await connection.execute(
          'DELETE FROM points WHERE id = ?',
          [P.id]
        );
      }
    }

    // --- New feature: Check order deliveries ---
    const [ordersRows]: any = await connection.execute(
      'SELECT id, customer_id, total_price, shipment FROM orders WHERE status < 2 AND shipment IS NOT NULL AND shipment != ""'
    );

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

    let deliveredCount = 0;

    // Group orders by customer_id
    const ordersByCustomer: Record<string, any[]> = {};
    for (const order of ordersRows) {
      if (!ordersByCustomer[order.customer_id]) {
        ordersByCustomer[order.customer_id] = [];
      }
      ordersByCustomer[order.customer_id].push(order);
    }

    for (const customerId of Object.keys(ordersByCustomer)) {
      const customerOrders = ordersByCustomer[customerId];
      
      const [customerRows]: any = await connection.execute(
        'SELECT point FROM customers WHERE id = ? FOR UPDATE',
        [customerId]
      );
      
      if (customerRows.length === 0) continue;
      
      let Rpoint = customerRows[0].point || 0;
      let pointsChanged = false;

      for (let i = 0; i < customerOrders.length; i++) {
        const order = customerOrders[i];
        let shipmentString = "";
        
        // Parse buffer to string if needed
        if (Buffer.isBuffer(order.shipment)) {
          shipmentString = order.shipment.toString('utf8');
        } else if (order.shipment && order.shipment.type === 'Buffer') {
          shipmentString = Buffer.from(order.shipment.data).toString('utf8');
        } else {
          shipmentString = String(order.shipment);
        }

        let carrierId = "kr.cjlogistics";
        let trackId = shipmentString.trim();

        if (shipmentString.includes('|')) {
          const [cName, tNum] = shipmentString.split('|');
          trackId = tNum.trim();
          const found = CARRIERS.find(c => c.name.includes(cName.trim()) || cName.trim().includes(c.name));
          if (found) {
            carrierId = found.id;
          }
        }

        const cleanTrackId = trackId.replace(/[^0-9a-zA-Z]/g, '');
        if (!cleanTrackId) continue;

        const apiUrl = `https://apis.tracker.delivery/carriers/${carrierId}/tracks/${cleanTrackId}`;
        try {
          const res = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
          if (res.ok) {
            const data = await res.json();
            // Check if delivered
            if (data && data.state && data.state.id === 'delivered') {
              await connection.execute(
                'UPDATE orders SET status = 2, received_at = NOW() WHERE id = ?',
                [order.id]
              );
              
              const pointAmount = Math.round((order.total_price || 0) * 0.001);
              await connection.execute(
                'INSERT INTO points (customer_id, order_id, point_amount, expired_at) VALUES (?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 30 DAY))',
                [customerId, order.id, pointAmount]
              );
              
              Rpoint += pointAmount;
              pointsChanged = true;
              deliveredCount++;
            }
          }
        } catch (err) {
          console.error(`Failed to track order ${order.id}:`, err);
        }
      }

      if (pointsChanged) {
        await connection.execute(
          'UPDATE customers SET point = ? WHERE id = ?',
          [Rpoint, customerId]
        );
      }
    }

    await connection.commit();
    return NextResponse.json({ 
      success: true, 
      message: `Processed ${N} expired point records. Updated ${deliveredCount} orders to delivered.` 
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Database error in /api/cron/expire-points:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  } finally {
    connection.release();
  }
}
