import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { paymentKey, cancelReason, cancelAmount, refundReceiveAccount } = await req.json();

    if (!paymentKey) {
      return NextResponse.json({ success: false, message: 'Missing paymentKey' }, { status: 400 });
    }

    const secretKey1 = process.env.TOSS_API_SECRET_KEY || 'test_sk_E92LAa5PVbNakNYZdRnJV7YmpXyJ';
    const secretKey2 = process.env.TOSS_SECRET_KEY || 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';
    
    const cancelBody: Record<string, any> = {
      cancelReason: cancelReason || '고객 취소',
    };
    if (cancelAmount !== undefined) cancelBody.cancelAmount = cancelAmount;
    if (refundReceiveAccount) cancelBody.refundReceiveAccount = refundReceiveAccount;

    const attemptCancel = async (key: string) => {
      const authHeader = 'Basic ' + Buffer.from(key + ':').toString('base64');
      return fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(cancelBody)
      });
    };

    let tossRes = await attemptCancel(secretKey1);
    let payment = await tossRes.json();
    console.log('[cancel] Try 1 with', secretKey1.substring(0,10), 'res:', payment.code, payment.message);

    if (!tossRes.ok && (payment.code === 'UNAUTHORIZED_KEY' || payment.code === 'FORBIDDEN_REQUEST')) {
      tossRes = await attemptCancel(secretKey2);
      payment = await tossRes.json();
      console.log('[cancel] Try 2 with', secretKey2.substring(0,10), 'res:', payment.code, payment.message);
    }

    if (!tossRes.ok) {
      console.log('[cancel] Failed both. Final code:', payment.code, payment.message);
      if (payment.code === 'NOT_FOUND_PAYMENT' || payment.code === 'ALREADY_CANCELED_PAYMENT' || payment.code === 'NOT_CANCELABLE_PAYMENT') {
        return NextResponse.json({ success: true, message: 'Payment already cancelled or not found, continuing with DB update.', payment });
      }
      return NextResponse.json({ success: false, message: payment.message || payment.code, error: payment }, { status: 400 });
    }

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
