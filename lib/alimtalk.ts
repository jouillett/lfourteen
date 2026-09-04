import crypto from 'crypto';

function makeSignature(method: string, uri: string, timestamp: string, accessKey: string, secretKey: string) {
  const space = " ";
  const newLine = "\n";
  const message = [];
  
  message.push(method);
  message.push(space);
  message.push(uri);
  message.push(newLine);
  message.push(timestamp);
  message.push(newLine);
  message.push(accessKey);
  
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(message.join(''));
  return hmac.digest('base64');
}

export async function sendShipmentAlimtalk(toPhone: string, data: { name: string, delivery: string, invoice: string }) {
  const serviceId = 'ncp:kkobizmsg:kr:375127873584:lfourteen';
  const plusFriendId = '@엘포틴코디';
  const templateCode = 'shipment';

  const accessKey = process.env.SMS_ACCESS_KEY || '';
  const secretKey = process.env.SMS_SECRET_KEY || '';

  if (!accessKey || !secretKey) {
    console.error('Missing SMS_ACCESS_KEY or SMS_SECRET_KEY');
    return;
  }

  const method = 'POST';
  const uri = `/alimtalk/v2/services/${encodeURIComponent(serviceId)}/messages`;
  const url = `https://sens.apigw.ntruss.com${uri}`;
  const timestamp = Date.now().toString();

  const signature = makeSignature(method, uri, timestamp, accessKey, secretKey);

  // Parse phone number (e.g. remove hyphens)
  const phone = toPhone.replace(/[^0-9]/g, '');

  const content = `[기쁜하루 배송 시작]

${data.name} 고객님, 안녕하세요.
고객님께서 주문하신 상품을 택배사에 전달하기 위한 발송 준비가 완료되었습니다.

택배사명 ${data.delivery}
송장번호 ${data.invoice}`;

  const body = {
    plusFriendId,
    templateCode,
    messages: [
      {
        to: phone,
        content: content,
        buttons: [
          {
            type: 'DS',
            name: '배송조회'
          }
        ]
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-ncp-apigw-timestamp': timestamp,
        'x-ncp-iam-access-key': accessKey,
        'x-ncp-apigw-signature-v2': signature,
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();
    console.log('Alimtalk send result:', result);
    return result;
  } catch (error) {
    console.error('Error sending alimtalk:', error);
  }
}
