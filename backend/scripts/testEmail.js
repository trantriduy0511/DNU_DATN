import dotenv from 'dotenv';
import { sendEmail, verifyEmailConfig, emailTemplates } from '../utils/emailService.js';

dotenv.config();

const testEmail = async () => {
  console.log('🧪 Testing Email Service...\n');
  
  // Check environment variables
  console.log('📋 Checking environment variables:');
  console.log(`   EMAIL_SERVICE: ${process.env.EMAIL_SERVICE || 'NOT SET'}`);
  console.log(`   EMAIL_USER: ${process.env.EMAIL_USER ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || 'NOT SET (using default)'}`);
  console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || 'NOT SET (using default)'}\n`);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Email configuration is missing!');
    console.log('\n📝 To configure email, add to backend/.env:');
    console.log('   EMAIL_SERVICE=gmail');
    console.log('   EMAIL_USER=your-email@gmail.com');
    console.log('   EMAIL_PASSWORD=your-app-password');
    console.log('\n💡 For Gmail, get App Password at: https://myaccount.google.com/apppasswords');
    process.exit(1);
  }

  // Verify email configuration
  console.log('🔍 Verifying email configuration...');
  const isConfigured = await verifyEmailConfig();
  
  if (!isConfigured) {
    console.error('\n❌ Email service verification failed!');
    console.log('\n💡 Common issues:');
    console.log('   1. Wrong email or password');
    console.log('   2. For Gmail: Must use App Password (not regular password)');
    console.log('   3. 2-Step Verification must be enabled for Gmail');
    console.log('   4. Check SMTP settings if using custom SMTP');
    process.exit(1);
  }

  // Test sending email
  const testEmail = process.env.TEST_EMAIL || process.env.EMAIL_USER;
  console.log(`\n📧 Sending test email to ${testEmail}...`);
  
  const result = await sendEmail({
    to: testEmail,
    subject: 'Test Email - DNU Social',
    html: emailTemplates.passwordResetOTPEmail('Test User', '123456')
  });

  if (result.success) {
    console.log('\n✅ Test email sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`\n📬 Please check ${testEmail} for the test email.`);
  } else {
    console.error('\n❌ Failed to send test email!');
    console.error(`   Error: ${result.error || result.message}`);
    if (result.details) {
      console.error(`   Details: ${result.details}`);
    }
    process.exit(1);
  }
};

testEmail().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});










