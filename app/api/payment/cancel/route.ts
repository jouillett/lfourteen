import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { paymentKey, cancelReason, cancelAmount, refundReceiveAccount } = await req.json();

    if (!paymentKey) {
      return NextResponse.json({ success: false, message: 'Missing paymentKey' }, { status: 400 });
    }

    const secretKey = process.env.TOSS_SECRET_KEY || 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';
    const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');

    // Build cancel body — virtual account/bank transfer refunds require refundReceiveAccount
    const cancelBody: Record<string, any> = {
      cancelReason: cancelReason || '고객 요청',
    };
    if (cancelAmount !== undefined) {
      cancelBody.cancelAmount = cancelAmount;
    }
    if (refundReceiveAccount) {
      cancelBody.refundReceiveAccount = refundReceiveAccount;
    }

    const tossRes = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cancelBody)
    });

    const payment = await tossRes.json();

    if (!tossRes.ok) {
      return NextResponse.json({ success: false, message: payment.message || payment.code, error: payment }, { status: 400 });
    }

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
