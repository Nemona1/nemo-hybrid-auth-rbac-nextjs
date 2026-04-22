import nodemailer from 'nodemailer';

// Configure transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true,
  maxConnections: 5,
  rateDelta: 1000,
  rateLimit: 5,
});

// Verify transporter on startup
const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log('[OTP EMAIL] SMTP connection verified');
  } catch (error) {
    console.error('[OTP EMAIL] SMTP connection failed:', error.message);
  }
};
verifyTransporter();

const getSender = () => {
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;
  return `"Nemo Auth" <${fromEmail}>`;
};

const getBaseUrl = () => {
  let baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  if (baseUrl.includes(':3000') && baseUrl.includes('.app.github.dev')) {
    baseUrl = baseUrl.replace(':3000', '');
  }
  return baseUrl.replace(/\/$/, '');
};

/**
 * Send OTP for password change
 */
export async function sendPasswordChangeOtp(email, otp, firstName) {
  console.log('[OTP EMAIL] Sending OTP to:', email);
  console.log('[OTP EMAIL] OTP:', otp);
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Change Verification - Nemo Auth</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1e293b;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 500px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #0ea5e9, #3b82f6);
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 28px;
        }
        .header p {
          color: rgba(255,255,255,0.9);
          margin: 5px 0 0;
        }
        .content {
          padding: 30px;
        }
        .otp-code {
          background: #f1f5f9;
          padding: 20px;
          text-align: center;
          font-size: 36px;
          font-family: 'Courier New', monospace;
          letter-spacing: 10px;
          font-weight: bold;
          color: #0ea5e9;
          border-radius: 12px;
          margin: 20px 0;
        }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 12px;
          margin: 20px 0;
          font-size: 13px;
          border-radius: 8px;
        }
        .footer {
          background: #f8fafc;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nemo Auth</h1>
          <p>Password Change Verification</p>
        </div>
        <div class="content">
          <h2>Hello ${firstName},</h2>
          <p>We received a request to change your password. Use the verification code below to complete the process.</p>
          
          <div class="otp-code">
            ${otp}
          </div>
          
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          
          <div class="warning">
            <strong>⚠️ Security Notice</strong><br>
            If you did not request this password change, please ignore this email. Your password will remain unchanged.
            For your security, never share this code with anyone.
          </div>
          
          <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
        <div class="footer">
          <p><strong>Nemo Auth</strong> - Enterprise Authentication System</p>
          <p>&copy; ${new Date().getFullYear()} Nemo Auth. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const textContent = `
    Password Change Verification - Nemo Auth
    
    Hello ${firstName},
    
    We received a request to change your password. Use the verification code below:
    
    ${otp}
    
    This code will expire in 10 minutes.
    
    If you did not request this password change, please ignore this email.
    
    ---
    Nemo Auth - Enterprise Authentication System
    This is an automated message.
  `;
  
  try {
    const info = await transporter.sendMail({
      from: getSender(),
      to: email,
      subject: 'Password Change Verification Code - Nemo Auth',
      html: htmlContent,
      text: textContent,
      replyTo: null,
    });
    console.log('[OTP EMAIL] Sent successfully, ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('[OTP EMAIL] Error:', error);
    return false;
  }
}

/**
 * Send security alert email for suspicious activity
 */
export async function sendSecurityAlertEmail(email, firstName, alertType, details) {
  let alertTitle = '';
  let alertMessage = '';
  let alertColor = '#ef4444';
  
  switch (alertType) {
    case 'password_change_attempt':
      alertTitle = '⚠️ Multiple Failed Password Change Attempts';
      alertMessage = `We detected ${details.attempts} failed attempts to change your password. Your account has been temporarily locked for 1 minute for security reasons.`;
      break;
    case 'otp_verification_failed':
      alertTitle = '⚠️ Multiple Failed Verification Code Attempts';
      alertMessage = `We detected ${details.attempts} failed attempts to verify the password change code. Your account has been temporarily locked for 1 minute for security reasons.`;
      break;
    case 'suspicious_login':
      alertTitle = '⚠️ Suspicious Login Detected';
      alertMessage = `We detected a login attempt from an unrecognized device or location.`;
      break;
    default:
      alertTitle = '⚠️ Security Alert';
      alertMessage = 'Suspicious activity detected on your account.';
  }
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Security Alert - Nemo Auth</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #1e293b;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 500px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, ${alertColor}, #dc2626);
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px;
        }
        .alert-box {
          background: #fef2f2;
          border-left: 4px solid ${alertColor};
          padding: 15px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .details-box {
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
          font-size: 13px;
        }
        .footer {
          background: #f8fafc;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nemo Auth</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Security Alert</p>
        </div>
        <div class="content">
          <h2>Hello ${firstName},</h2>
          <div class="alert-box">
            <p><strong>${alertTitle}</strong></p>
            <p>${alertMessage}</p>
          </div>
          
          <div class="details-box">
            <strong>📋 Details:</strong><br>
            IP Address: ${details.ipAddress}<br>
            Time: ${new Date().toLocaleString()}<br>
            User Agent: ${details.userAgent?.substring(0, 100) || 'Unknown'}
          </div>
          
          <p><strong>What you can do:</strong></p>
          <ul>
            <li>If this was you, no action is required.</li>
            <li>If this wasn't you, please change your password immediately.</li>
            <li>Contact support if you need assistance.</li>
          </ul>
        </div>
        <div class="footer">
          <p><strong>Nemo Auth</strong> - Enterprise Authentication System</p>
          <p>This is an automated security alert.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    await transporter.sendMail({
      from: getSender(),
      to: email,
      subject: 'Security Alert - Nemo Auth',
      html: htmlContent,
      replyTo: null,
    });
    console.log('[SECURITY ALERT] Sent to:', email);
    return true;
  } catch (error) {
    console.error('[SECURITY ALERT] Error:', error);
    return false;
  }
}

/**
 * Send password changed confirmation email
 */
export async function sendPasswordChangedEmail(email, firstName) {
  const baseUrl = getBaseUrl();
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Password Changed - Nemo Auth</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #1e293b;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 500px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #10b981, #059669);
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px;
        }
        .success-box {
          background: #f0fdf4;
          border-left: 4px solid #10b981;
          padding: 15px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .footer {
          background: #f8fafc;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nemo Auth</h1>
          <p>Password Changed Successfully</p>
        </div>
        <div class="content">
          <h2>Hello ${firstName},</h2>
          <div class="success-box">
            <p><strong>✅ Your password has been successfully changed.</strong></p>
            <p>If you made this change, no further action is required.</p>
          </div>
          
          <p><strong>Security Information:</strong></p>
          <ul>
            <li>You have been logged out from all devices</li>
            <li>You will need to log in again with your new password</li>
            <li>This change was recorded in our security logs</li>
          </ul>
          
          <p>If you did NOT change your password, please contact support immediately.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${baseUrl}/login" style="background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Login to Your Account</a>
          </div>
        </div>
        <div class="footer">
          <p><strong>Nemo Auth</strong> - Enterprise Authentication System</p>
          <p>This is an automated message.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    await transporter.sendMail({
      from: getSender(),
      to: email,
      subject: 'Password Changed Successfully - Nemo Auth',
      html: htmlContent,
      replyTo: null,
    });
    console.log('[PASSWORD CHANGED] Email sent to:', email);
    return true;
  } catch (error) {
    console.error('[PASSWORD CHANGED] Error:', error);
    return false;
  }
}