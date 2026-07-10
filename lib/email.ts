import nodemailer from 'nodemailer';
import path from 'path';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface SubscriptionSuccessData {
  paymentDate: string;
  amount: number;
  nextPaymentDate: string;
}

export async function sendSubscriptionSuccessEmail(toEmail: string, data: SubscriptionSuccessData) {
  const fromEmail = process.env.SMTP_FROM || '"L14 Cordy" <noreply@l14cordy.com>';
  
  const formattedAmount = new Intl.NumberFormat('ko-KR').format(data.amount);

  const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
  <title>기쁜하루 정기 결제 완료</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans KR',sans-serif;color:#333333;">
  <div style="max-width:480px;margin:0 auto;background-color:#ffffff;border:1px solid #e5e5e5;">

    <!-- Main Content Area -->
    <div style="padding:40px 24px 48px 24px;">

      <!-- Logo -->
      <div style="margin-bottom:24px;">
        <h1 style="margin:0;font-size:36px;font-weight:700;font-style:italic;font-family:Georgia,serif;color:#941F32;">기쁜하루</h1>
      </div>

      <!-- Header Text -->
      <div style="margin-bottom:32px;">
        <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#941F32;line-height:1.4;">기쁜하루 정기결제가<br/>완료되었습니다.</h2>
        <p style="margin:0;font-size:15px;color:#666666;">결제 정보를 확인해주세요.</p>
      </div>

      <!-- Product Image -->
      <div style="margin-bottom:32px;text-align:center;">
        <img src="cid:product_image" alt="엘포틴 코디 제품" width="300" style="max-width:100%;height:auto;display:inline-block;border-radius:8px;" />
      </div>

      <!-- Payment Info Section -->
      <div style="margin-bottom:40px;">
        <h3 style="margin:0 0 16px 0;font-size:15px;font-weight:700;color:#333333;">결제 정보</h3>
        <!-- Data Table -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:2px solid #333333;">
          <tr>
            <td width="34%" style="padding:12px;background-color:#f5f5f5;font-size:13px;font-weight:500;color:#555555;border-bottom:1px solid #e5e5e5;vertical-align:middle;">결제일</td>
            <td style="padding:12px;font-size:13px;font-weight:600;color:#111111;border-bottom:1px solid #e5e5e5;vertical-align:middle;">${data.paymentDate}</td>
          </tr>
          <tr>
            <td style="padding:12px;background-color:#f5f5f5;font-size:13px;font-weight:500;color:#555555;border-bottom:1px solid #e5e5e5;vertical-align:middle;">결제금액</td>
            <td style="padding:12px;font-size:13px;font-weight:600;color:#111111;border-bottom:1px solid #e5e5e5;vertical-align:middle;">${formattedAmount}원</td>
          </tr>
          <tr>
            <td style="padding:12px;background-color:#f5f5f5;font-size:13px;font-weight:500;color:#555555;border-bottom:1px solid #e5e5e5;vertical-align:middle;">다음 결제 예정일</td>
            <td style="padding:12px;font-size:13px;font-weight:600;color:#111111;border-bottom:1px solid #e5e5e5;vertical-align:middle;">${data.nextPaymentDate}</td>
          </tr>
        </table>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center;">
        <a href="https://l14cordy.com/mypage/billing" style="display:inline-block;background-color:#941F32;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:16px 32px;border-radius:6px;min-width:260px;text-align:center;">기쁜하루 정기결제 정보 확인하기</a>
      </div>

    </div>
    <!-- End Main Content Area -->

    <!-- Notice Area -->
    <div style="background-color:#f5f5f5;padding:24px;border-top:1px solid #e5e5e5;">
      <p style="margin:0 0 8px 0;font-size:12px;color:#666666;line-height:1.6;">본 메일은 발신 전용으로 회신되지 않습니다. 문의사항은 <strong>문의 게시판</strong>을 이용해주세요.</p>
      <p style="margin:0;font-size:12px;color:#666666;line-height:1.6;">주문 관련 정보, 주요 공지사항등은 수신 동의 여부에 관계없이 발송됩니다.</p>
    </div>

    <!-- Footer -->
    <div style="padding:32px 24px;display:flex;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="140" style="vertical-align:top;padding-right:16px;white-space:nowrap;">
            <span style="font-size:22px;font-weight:700;font-style:italic;font-family:Georgia,serif;color:#941F32;">L14 Cordy</span>
          </td>
          <td style="vertical-align:top;">
            <p style="margin:0 0 4px 0;font-size:11px;color:#888888;line-height:1.6;">대표 조민균 | 사업자등록번호: 691-23-02249 | 통신판매업 신고번호: 2026-성남분당A-0172</p>
            <p style="margin:0 0 4px 0;font-size:11px;color:#888888;line-height:1.6;">문의전화: 031-755-1568</p>
            <p style="margin:16px 0 0 0;font-size:10px;color:#aaaaaa;">© 2026 L14 Cordy. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </div>
    <!-- End Footer -->

  </div>
</body>
</html>
  `;

  const productImagePath = path.join(process.cwd(), 'public', 'images', 'product', 'product.png');

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject: '[기쁜하루] 엘포틴 코디 정기구매가 정상적으로 완료되었습니다.',
      html: htmlContent,
      attachments: [
        {
          filename: 'product.png',
          path: productImagePath,
          cid: 'product_image',
        },
      ],
    });
    console.log('Subscription success email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending subscription success email:', error);
  }
}
