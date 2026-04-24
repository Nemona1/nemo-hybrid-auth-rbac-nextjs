import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const getSender = () => {
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;
  return `"Nemo Auth" <${fromEmail}>`;
};

/**
 * Send 2FA verification code email
 */
export async function send2faOtpEmail(email, otp, firstName) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Two-Factor Authentication - Nemo Auth</title>
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
          background: linear-gradient(135deg, #0ea5e9, #3b82f6);
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 28px;
        }
        .content {
          padding: 30px;
        }
        .otp-code {
          background: #f1f5f9;
          padding: 20px;
          text-align: center;
          font-size: 36px;
          font-family: monospace;
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
          <p>Two-Factor Authentication</p>
        </div>
        <div class="content">
          <h2>Hello ${firstName},</h2>
          <p>Use the verification code below to complete your login:</p>
          
          <div class="otp-code">
            ${otp}
          </div>
          
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          
          <div class="warning">
            <strong>🔒 Security Notice</strong><br>
            If you didn't request this, please change your password immediately.
          </div>
        </div>
        <div class="footer">
          <p><strong>Nemo Auth</strong> - Enterprise Authentication System</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    await transporter.sendMail({
      from: getSender(),
      to: email,
      subject: 'Your Two-Factor Authentication Code - Nemo Auth',
      html: htmlContent,
      replyTo: null,
    });
    console.log('[2FA EMAIL] Sent to:', email);
    return true;
  } catch (error) {
    console.error('[2FA EMAIL] Error:', error);
    return false;
  }
}

/**
 * Send backup codes email
 */
export async function sendBackupCodesEmail(email, backupCodes, firstName) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Your Backup Codes - Nemo Auth</title>
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
        .content {
          padding: 30px;
        }
        .codes-box {
          background: #f8fafc;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
          margin: 20px 0;
        }
        .code-item {
          display: inline-block;
          background: white;
          padding: 8px 12px;
          margin: 5px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          font-family: monospace;
          font-weight: bold;
        }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 12px;
          margin: 20px 0;
          font-size: 13px;
          border-radius: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nemo Auth</h1>
          <p>Your Backup Codes</p>
        </div>
        <div class="content">
          <h2>Hello ${firstName},</h2>
          <p>You have enabled Two-Factor Authentication. Please save these backup codes.</p>
          
          <div class="codes-box">
            ${backupCodes.map(code => `<div class="code-item">${code}</div>`).join('')}
          </div>
          
          <div class="warning">
            <strong>⚠️ Important</strong><br>
            • Each code can only be used once<br>
            • Keep these codes safe<br>
            • Use these codes if you lose access to your email
          </div>
        </div>
        <div class="footer">
          <p><strong>Nemo Auth</strong> - Enterprise Authentication System</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    await transporter.sendMail({
      from: getSender(),
      to: email,
      subject: 'Your 2FA Backup Codes - Nemo Auth',
      html: htmlContent,
      replyTo: null,
    });
    return true;
  } catch (error) {
    console.error('[BACKUP CODES EMAIL] Error:', error);
    return false;
  }
}