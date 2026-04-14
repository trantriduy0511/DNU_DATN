import nodemailer from "nodemailer";

// Create transporter
const createTransporter = () => {
  // Use Gmail SMTP or custom SMTP
  if (process.env.EMAIL_SERVICE === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // App password for Gmail
      },
    });
  }

  // Custom SMTP
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Verify email configuration
export const verifyEmailConfig = async () => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn("⚠️  Email service not configured.");
      console.warn("⚠️  Please add to backend/.env:");
      console.warn("   EMAIL_SERVICE=gmail");
      console.warn("   EMAIL_USER=your-email@gmail.com");
      console.warn("   EMAIL_PASSWORD=your-app-password");
      console.warn(
        "⚠️  For Gmail, get App Password at: https://myaccount.google.com/apppasswords",
      );
      return false;
    }

    const transporter = createTransporter();
    await transporter.verify();
    console.log("✅ Email service configured successfully");
    console.log(`   Using: ${process.env.EMAIL_USER}`);
    return true;
  } catch (error) {
    console.error("❌ Email service configuration error:", error.message);
    if (error.message.includes("Invalid login") || error.code === "EAUTH") {
      console.error(
        "   💡 For Gmail, you must use App Password (not regular password)",
      );
      console.error(
        "   💡 Get App Password: https://myaccount.google.com/apppasswords",
      );
    }
    console.warn(
      "⚠️  Email features will be disabled until configured correctly",
    );
    return false;
  }
};

// Send email
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      const errorMsg =
        "Email service not configured. Please set EMAIL_USER and EMAIL_PASSWORD in .env file";
      console.warn(`⚠️  ${errorMsg}`);
      console.warn("⚠️  For Gmail: Use App Password (not regular password)");
      console.warn(
        "⚠️  Get App Password: https://myaccount.google.com/apppasswords",
      );
      return { success: false, message: errorMsg };
    }

    const transporter = createTransporter();

    // Verify connection before sending
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error(
        "❌ Email service verification failed:",
        verifyError.message,
      );
      if (verifyError.message.includes("Invalid login")) {
        return {
          success: false,
          error:
            "Email credentials invalid. Please check EMAIL_USER and EMAIL_PASSWORD in .env",
          details:
            "For Gmail, you must use App Password, not your regular password",
        };
      }
      return {
        success: false,
        error: `Email service error: ${verifyError.message}`,
      };
    }

    const mailOptions = {
      from: `"DNU Social" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    };

    console.log(`📧 Attempting to send email to ${to}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`   Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    console.error("   Full error:", error);

    // Provide helpful error messages
    let errorMessage = error.message;
    if (error.message.includes("Invalid login") || error.code === "EAUTH") {
      errorMessage =
        "Email credentials invalid. For Gmail, use App Password (not regular password).";
    } else if (
      error.message.includes("ECONNECTION") ||
      error.code === "ECONNECTION"
    ) {
      errorMessage =
        "Cannot connect to email server. Check your internet connection and SMTP settings.";
    }

    return {
      success: false,
      error: errorMessage,
      details: error.message,
    };
  }
};

// Email templates
export const emailTemplates = {
  // Email verification template
  verificationEmail: (name, verificationUrl) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác thực Email - DNU Social</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #3b82f6;
      margin-bottom: 10px;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #3b82f6;
      color: #ffffff;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      background-color: #2563eb;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
    }
    .link {
      color: #3b82f6;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">DNU Social</div>
      <p style="color: #6b7280; margin: 0;">Mạng xã hội học tập Đại học Đại Nam</p>
    </div>
    
    <div class="content">
      <h2 style="color: #1f2937;">Xin chào ${name}!</h2>
      <p>Cảm ơn bạn đã đăng ký tài khoản trên DNU Social. Để hoàn tất đăng ký, vui lòng xác thực email của bạn bằng cách nhấn vào nút bên dưới:</p>
      
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">Xác thực Email</a>
      </div>
      
      <p>Hoặc copy và dán link sau vào trình duyệt:</p>
      <p class="link">${verificationUrl}</p>
      
      <p style="color: #ef4444; font-size: 14px; margin-top: 20px;">
        <strong>Lưu ý:</strong> Link này sẽ hết hạn sau 24 giờ. Nếu bạn không yêu cầu đăng ký tài khoản này, vui lòng bỏ qua email này.
      </p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} DNU Social. Tất cả quyền được bảo lưu.</p>
      <p>Đại học Đại Nam - "Học để thay đổi"</p>
    </div>
  </div>
</body>
</html>
    `;
  },

  // Password reset OTP template
  passwordResetOTPEmail: (name, otp) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mã xác thực đặt lại mật khẩu - DNU Social</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #3b82f6;
      margin-bottom: 10px;
    }
    .content {
      margin-bottom: 30px;
    }
    .otp-box {
      background-color: #f0f9ff;
      border: 2px solid #3b82f6;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-code {
      font-size: 36px;
      font-weight: bold;
      color: #1e40af;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">DNU Social</div>
      <p style="color: #6b7280; margin: 0;">Mạng xã hội học tập Đại học Đại Nam</p>
    </div>
    
    <div class="content">
      <h2 style="color: #1f2937;">Xin chào ${name}!</h2>
      <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản DNU Social. Mã xác thực một lần của bạn là:</p>
      
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
      </div>
      
      <p style="text-align: center; color: #6b7280; font-size: 14px;">
        Mã này sẽ hết hạn trong <strong>10 phút</strong>.
      </p>
      
      <div class="warning">
        <p style="margin: 0; color: #92400e;">
          <strong>⚠️ Cảnh báo bảo mật:</strong> Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Có thể ai đó đã nhập nhầm địa chỉ email của bạn.
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} DNU Social. Tất cả quyền được bảo lưu.</p>
      <p>Đại học Đại Nam - "Học để thay đổi"</p>
    </div>
  </div>
</body>
</html>
    `;
  },

  // Password reset template (old - for URL token)
  passwordResetEmail: (name, resetUrl) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đặt lại Mật khẩu - DNU Social</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #3b82f6;
      margin-bottom: 10px;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #3b82f6;
      color: #ffffff;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      background-color: #2563eb;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
    }
    .link {
      color: #3b82f6;
      word-break: break-all;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">DNU Social</div>
      <p style="color: #6b7280; margin: 0;">Mạng xã hội học tập Đại học Đại Nam</p>
    </div>
    
    <div class="content">
      <h2 style="color: #1f2937;">Xin chào ${name}!</h2>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Đặt lại Mật khẩu</a>
      </div>
      
      <p>Hoặc copy và dán link sau vào trình duyệt:</p>
      <p class="link">${resetUrl}</p>
      
      <div class="warning">
        <p style="margin: 0; color: #92400e;">
          <strong>⚠️ Cảnh báo bảo mật:</strong> Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Link này sẽ hết hạn sau 1 giờ.
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} DNU Social. Tất cả quyền được bảo lưu.</p>
      <p>Đại học Đại Nam - "Học để thay đổi"</p>
    </div>
  </div>
</body>
</html>
    `;
  },

  // Password reset success template
  passwordResetSuccess: (name) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mật khẩu đã được đặt lại - DNU Social</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #10b981;
      margin-bottom: 10px;
    }
    .content {
      margin-bottom: 30px;
    }
    .success-box {
      background-color: #d1fae5;
      border-left: 4px solid #10b981;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">✓ DNU Social</div>
      <p style="color: #6b7280; margin: 0;">Mạng xã hội học tập Đại học Đại Nam</p>
    </div>
    
    <div class="content">
      <h2 style="color: #1f2937;">Xin chào ${name}!</h2>
      
      <div class="success-box">
        <p style="margin: 0; color: #065f46;">
          <strong>✓ Mật khẩu của bạn đã được đặt lại thành công!</strong>
        </p>
      </div>
      
      <p>Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với chúng tôi ngay lập tức để bảo vệ tài khoản của bạn.</p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} DNU Social. Tất cả quyền được bảo lưu.</p>
      <p>Đại học Đại Nam - "Học để thay đổi"</p>
    </div>
  </div>
</body>
</html>
    `;
  },
};

export default { sendEmail, verifyEmailConfig, emailTemplates };
