import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { RowDataPacket } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventType, data } = body;
    console.log('[toss-webhook] Received event:', eventType, JSON.stringify(data));

    // Only handle virtual account deposit and payment status changes
    if (eventType !== 'VIRTUAL_ACCOUNT_FUNDED' && eventType !== 'PAYMENT_STATUS_CHANGED') {
      return NextResponse.json({ success: true, message: 'Event not handled' });
    }

    const paymentKey = data?.paymentKey;
    const orderId = data?.orderId; // e.g. "order_1234567890"

    if (!paymentKey || !orderId) {
      console.warn('[toss-webhook] Missing paymentKey or orderId');
      return NextResponse.json({ success: false, message: 'Missing paymentKey or orderId' }, { status: 400 });
    }

    // 2차 검증: Toss API로 실제 결제 상태 재확인
    const secretKey = process.env.TOSS_API_SECRET_KEY || process.env.TOSS_SECRET_KEY || '';
    const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');

    const tossRes = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}`, {
      method: 'GET',
      headers: { 'Authorization': authHeader },
    });

    if (!tossRes.ok) {
      console.error('[toss-webhook] Failed to verify payment with Toss API:', tossRes.status);
      return NextResponse.json({ success: false, message: 'Payment verification failed' }, { status: 500 });
    }

    const payment = await tossRes.json();
    console.log('[toss-webhook] Payment status from Toss:', payment.status, 'method:', payment.method);

    // orderId에서 숫자 부분만 추출 (order_ 제거)
    const orderNum = orderId.replace(/^order_/, '');

    const connection = await pool.getConnection();
    try {
      const [orderRows]: any = await connection.execute(
        'SELECT id, status FROM orders WHERE order_number = ? LIMIT 1',
        [orderNum]
      );

      if (!orderRows || orderRows.length === 0) {
        console.warn('[toss-webhook] Order not found for orderNum:', orderNum);
        connection.release();
        return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
      }

      const order = orderRows[0];

      if (payment.status === 'DONE') {
        // 입금 완료 → status 0(결제완료)으로 변경
        if (Number(order.status) === 99) {
          await connection.execute(
            'UPDATE orders SET status = 0 WHERE id = ?',
            [order.id]
          );
          console.log('[toss-webhook] Order', order.id, 'status updated: 99 → 0 (결제완료)');
        } else {
          console.log('[toss-webhook] Order', order.id, 'already processed, status:', order.status);
        }
      } else if (payment.status === 'EXPIRED' || payment.status === 'CANCELED') {
        // 기한 만료 / 취소 → status 3(취소)으로 변경
        if (Number(order.status) === 99) {
          await connection.execute(
            'UPDATE orders SET status = 3 WHERE id = ?',
            [order.id]
          );
          console.log('[toss-webhook] Order', order.id, 'status updated: 99 → 3 (취소). Toss status:', payment.status);
        }
      } else {
        console.log('[toss-webhook] Payment status not actionable:', payment.status);
      }

      connection.release();
      return NextResponse.json({ success: true });
    } catch (dbError) {
      connection.release();
      throw dbError;
    }
  } catch (error: any) {
    console.error('[toss-webhook] Error:', error?.message);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
