import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  console.log('[cron/check-virtual-accounts] Starting daily virtual account verification...');

  const secretKey = process.env.TOSS_API_SECRET_KEY || process.env.TOSS_SECRET_KEY || '';
  const authTossHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');

  const connection = await pool.getConnection();
  try {
    // Status 99인 주문 모두 조회
    const [pendingOrders]: any = await connection.execute(
      `SELECT id, order_number, payment_key, payment_method, customer_id, used_point, created_at
       FROM orders WHERE status = 99 ORDER BY created_at ASC`
    );

    console.log('[cron/check-virtual-accounts] Found pending orders:', pendingOrders.length);

    let confirmedCount = 0;
    let expiredCount = 0;
    let errorCount = 0;

    for (const order of pendingOrders) {
      if (!order.payment_key) {
        console.warn('[cron/check-virtual-accounts] No payment_key for order:', order.id);
        continue;
      }

      try {
        const tossRes = await fetch(`https://api.tosspayments.com/v1/payments/${order.payment_key}`, {
          method: 'GET',
          headers: { 'Authorization': authTossHeader },
        });

        if (!tossRes.ok) {
          console.error('[cron/check-virtual-accounts] Toss API error for order:', order.id, tossRes.status);
          errorCount++;
          continue;
        }

        const payment = await tossRes.json();
        console.log(`[cron/check-virtual-accounts] Order ${order.id}: Toss status = ${payment.status}`);

        if (payment.status === 'DONE') {
          // 입금 확인 → 결제완료(0)로 변경
          await connection.beginTransaction();
          await connection.execute(
            'UPDATE orders SET status = 0 WHERE id = ?',
            [order.id]
          );

          // 포인트 차감 처리
          if (order.used_point > 0 && order.customer_id) {
            console.log(`[cron/check-virtual-accounts] Deducting ${order.used_point} points for order ${order.id}`);
            let pointsToDeduct = Number(order.used_point);
            const [pointRecords]: any = await connection.execute(
              `SELECT id, point_amount FROM points WHERE customer_id = ? ORDER BY expired_at ASC FOR UPDATE`,
              [order.customer_id]
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
              [Number(order.used_point), order.customer_id]
            );
          }
          await connection.commit();

          confirmedCount++;
          console.log(`[cron/check-virtual-accounts] Order ${order.id}: 99 → 0 (결제완료)`);
        } else if (payment.status === 'EXPIRED' || payment.status === 'CANCELED') {
          // 만료/취소 → 취소(3)로 변경, 포인트 환불
          await connection.execute(
            'UPDATE orders SET status = 3 WHERE id = ?',
            [order.id]
          );
          expiredCount++;
          console.log(`[cron/check-virtual-accounts] Order ${order.id}: 99 → 3 (취소/만료). Toss status: ${payment.status}`);

          // 사용 포인트 환불 처리
          if (order.used_point > 0 && order.customer_id) {
            await connection.execute(
              `INSERT INTO points (customer_id, order_id, point_amount, created_at, expired_at)
               VALUES (?, ?, ?, NOW(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH))`,
              [order.customer_id, order.id, order.used_point]
            );
            await connection.execute(
              'UPDATE customers SET point = point + ? WHERE id = ?',
              [order.used_point, order.customer_id]
            );
            console.log(`[cron/check-virtual-accounts] Refunded ${order.used_point} points to customer ${order.customer_id}`);
          }
        } else {
          // WAITING_FOR_DEPOSIT 등 아직 입금 대기 중
          console.log(`[cron/check-virtual-accounts] Order ${order.id}: Still pending. Toss status: ${payment.status}`);
        }
      } catch (innerError: any) {
        console.error(`[cron/check-virtual-accounts] Error processing order ${order.id}:`, innerError?.message);
        errorCount++;
      }
    }

    connection.release();
    console.log(`[cron/check-virtual-accounts] Done. confirmed=${confirmedCount}, expired=${expiredCount}, errors=${errorCount}`);

    return NextResponse.json({
      success: true,
      total: pendingOrders.length,
      confirmed: confirmedCount,
      expired: expiredCount,
      errors: errorCount,
    });
  } catch (error: any) {
    connection.release();
    console.error('[cron/check-virtual-accounts] Fatal error:', error?.message);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
