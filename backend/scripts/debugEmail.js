import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🔍 DEBUG EMAIL CONFIGURATION\n');
console.log('═'.repeat(60));

// 1. Check .env file
console.log('\n1️⃣  Checking .env file...');
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  console.log('   ✅ File .env exists');
  const envContent = readFileSync(envPath, 'utf-8');
  const hasEmailUser = envContent.includes('EMAIL_USER');
  const hasEmailPass = envContent.includes('EMAIL_PASSWORD');
  console.log(`   ${hasEmailUser ? '✅' : '❌'} EMAIL_USER found`);
  console.log(`   ${hasEmailPass ? '✅' : '❌'} EMAIL_PASSWORD found`);
} else {
  console.log('   ❌ File .env NOT FOUND!');
  console.log('   📝 Create file: backend/.env');
  console.log('   📝 Add: EMAIL_USER=your-email@gmail.com');
  console.log('   📝 Add: EMAIL_PASSWORD=your-app-password');
  process.exit(1);
}

// 2. Check environment variables
console.log('\n2️⃣  Checking environment variables...');
console.log(`   EMAIL_SERVICE: ${process.env.EMAIL_SERVICE || '❌ NOT SET'}`);
console.log(`   EMAIL_USER: ${process.env.EMAIL_USER ? '✅ SET (' + process.env.EMAIL_USER + ')' : '❌ NOT SET'}`);
console.log(`   EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? '✅ SET (****)' : '❌ NOT SET'}`);
console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || 'NOT SET (using default)'}`);
console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || 'NOT SET (using default)'}`);

// 3. Validate configuration
console.log('\n3️⃣  Validating configuration...');
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.log('   ❌ Email configuration is INCOMPLETE!');
  console.log('\n📝 To fix:');
  console.log('   1. Open backend/.env');
  console.log('   2. Add: EMAIL_SERVICE=gmail');
  console.log('   3. Add: EMAIL_USER=your-email@gmail.com');
  console.log('   4. Add: EMAIL_PASSWORD=your-app-password');
  console.log('\n💡 Get Gmail App Password: https://myaccount.google.com/apppasswords');
  process.exit(1);
}

// 4. Test email service
console.log('\n4️⃣  Testing email service connection...');
try {
  const { verifyEmailConfig, sendEmail, emailTemplates } = await import('../utils/emailService.js');
  
  const isConfigured = await verifyEmailConfig();
  if (!isConfigured) {
    console.log('   ❌ Email service verification FAILED!');
    console.log('\n💡 Common issues:');
    console.log('   1. Wrong email or password');
    console.log('   2. For Gmail: Must use App Password (not regular password)');
    console.log('   3. 2-Step Verification must be enabled');
    process.exit(1);
  }
  
  console.log('   ✅ Email service verified successfully');
  
  // 5. Test sending email
  console.log('\n5️⃣  Testing email sending...');
  const testEmail = process.env.EMAIL_USER;
  console.log(`   Sending test email to: ${testEmail}`);
  
  const result = await sendEmail({
    to: testEmail,
    subject: '🧪 Test Email - DNU Social',
    html: emailTemplates.passwordResetOTPEmail('Test User', '123456')
  });
  
  if (result.success) {
    console.log('   ✅ Test email sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`\n📬 Please check ${testEmail} for the test email.`);
    console.log('   ⚠️  Also check Spam folder if not found in Inbox.');
  } else {
    console.log('   ❌ Failed to send test email!');
    console.log(`   Error: ${result.error || result.message}`);
    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
    process.exit(1);
  }
  
} catch (error) {
  console.error('   ❌ Error:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
}

console.log('\n' + '═'.repeat(60));
console.log('✅ All checks passed! Email service is working.');
console.log('═'.repeat(60));










