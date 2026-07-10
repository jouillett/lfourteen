import * as dotenv from 'dotenv';
dotenv.config();

async function runTest() {
  const { sendSubscriptionSuccessEmail } = await import('./lib/email');
  console.log('Testing email with the following SMTP config:');
  console.log('- SMTP_HOST:', process.env.SMTP_HOST || 'Not set (using fallback)');
  console.log('- SMTP_PORT:', process.env.SMTP_PORT || 'Not set (using fallback)');
  console.log('- SMTP_USER:', process.env.SMTP_USER || 'Not set');
  console.log('- SMTP_FROM:', process.env.SMTP_FROM || 'Not set (using fallback)');
  console.log('--------------------------------------------------');

  const testEmail = process.argv[2] || process.env.SMTP_USER || 'test@example.com';
  
  console.log(`Sending test email to: ${testEmail}...`);

  try {
    const info = await sendSubscriptionSuccessEmail(testEmail, {
      paymentDate: '2026-07-09',
      amount: 1900,
      nextPaymentDate: '2026-08-09'
    });
    
    console.log('Test completed successfully!');
    if (info && info.messageId) {
      console.log('Message ID:', info.messageId);
      // Ethereal mock output URL if applicable
      if (process.env.SMTP_HOST === 'smtp.ethereal.email') {
        // we can't easily get the URL without nodemailer.getTestMessageUrl, but the user can use their own SMTP
      }
    }
  } catch (err) {
    console.error('Test failed with error:', err);
  }
}

runTest();
