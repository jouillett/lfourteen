import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { receiver, code, message } = await req.json();

    if (!receiver || !message) {
      return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
    }

    const accessKey = process.env.SMS_ACCESS_KEY;
    const secretKey = process.env.SMS_SECRET_KEY;
    const apiId = process.env.SMS_API_ID;
    
    // Fallback if env vars are missing
    if (!accessKey || !secretKey || !apiId) {
      console.warn("SMS credentials not fully configured in .env");
      // Simulate success for local dev if keys are missing
      return NextResponse.json({ success: true, message: 'Simulated SMS send' });
    }

    const method = "POST";
    const space = " ";
    const newLine = "\n";
    const timestamp = Date.now().toString();
    const url2 = `/sms/v2/services/${encodeURIComponent(apiId)}/messages`;

    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(method);
    hmac.update(space);
    hmac.update(url2);
    hmac.update(newLine);
    hmac.update(timestamp);
    hmac.update(newLine);
    hmac.update(accessKey);
    const signature = hmac.digest('base64');

    const apiUrl = `https://sens.apigw.ntruss.com${url2}`;

    const body = {
      type: "SMS",
      contentType: "COMM",
      countryCode: "82",
      from: "01095941568", // Registered sender number
      content: message,
      messages: [
        {
          to: receiver.replace(/[^0-9]/g, ""),
        }
      ]
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-ncp-apigw-timestamp": timestamp,
        "x-ncp-iam-access-key": accessKey,
        "x-ncp-apigw-signature-v2": signature,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({ success: true, data });
    } else {
      console.error("Naver SMS API Error:", data);
      return NextResponse.json({ success: false, message: data.error?.message || 'SMS API Error' }, { status: response.status });
    }

  } catch (error) {
    console.error('Error sending SMS:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
