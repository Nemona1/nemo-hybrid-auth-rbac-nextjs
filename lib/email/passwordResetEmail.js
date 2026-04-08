// Password Reset Email Service
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  debug: false,
  logger: false,
});

const getSender = () => {
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;
  return `"Nemo Auth" <${fromEmail}>`;
};

export async function sendPasswordResetEmail(email, token, firstName) {
  // Get base URL and clean it
  let baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  // Remove port for Codespaces
  if (baseUrl.includes(':3000') && baseUrl.includes('.app.github.dev')) {
    baseUrl = baseUrl.replace(':3000', '');
  }
  baseUrl = baseUrl.replace(/\/$/, '');
  
  // IMPORTANT: Use the page route, NOT the API route
  // Correct: /reset-password/[token]
  // Wrong: /api/auth/reset-password/[token]
  const resetUrl = `${baseUrl}/reset-password/${token}`;
  
  console.log('[PASSWORD RESET EMAIL] ========================================');
  console.log('[PASSWORD RESET EMAIL] Preparing for:', email);
  console.log('[PASSWORD RESET EMAIL] Reset URL (page route):', resetUrl);
  console.log('[PASSWORD RESET EMAIL] ========================================');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - Nemo Auth</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1e293b;
          background-color: #f1f5f9;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #0EA5E9, #3B82F6);
          color: white;
          padding: 30px 20px;
          text-align: center;
          border-radius: 16px 16px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .header p {
          margin: 10px 0 0;
          opacity: 0.9;
        }
        .content {
          background: white;
          padding: 32px;
          border-radius: 0 0 16px 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .button {
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(135deg, #0EA5E9, #3B82F6);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          margin: 24px 0;
          font-weight: 600;
          text-align: center;
          transition: transform 0.2s;
        }
        .button:hover {
          transform: scale(1.02);
        }
        .link-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 12px;
          border-radius: 8px;
          word-break: break-all;
          font-family: monospace;
          font-size: 12px;
          margin: 16px 0;
        }
        .footer {
          text-align: center;
          padding: 24px;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          margin-top: 24px;
        }
        .security-note {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 12px;
          margin: 20px 0;
          font-size: 13px;
          border-radius: 4px;
        }
        .warning {
          color: #dc2626;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nemo Auth</h1>
          <p>Password Reset Request</p>
        </div>
        <div class="content">
          <h2>Hello ${firstName},</h2>
          <p>We received a request to reset your password for your <strong>Nemo Auth</strong> account.</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <div class="link-box">${resetUrl}</div>
          
          <div class="security-note">
            <strong>🔒 Security Note:</strong> 
            <ul style="margin: 8px 0 0 20px; padding: 0;">
              <li>This link will expire in <span class="warning">60 minutes</span></li>
              <li>If you didn't request a password reset, please ignore this email</li>
              <li>Your password will remain unchanged until you create a new one</li>
            </ul>
          </div>
          
          <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
            For security reasons, never share this link with anyone. Nemo Auth support will never ask for your password.
          </p>
        </div>
        <div class="footer">
          <p><strong>Nemo Auth</strong> - Enterprise Authentication System</p>
          <p>This is an automated message, please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Nemo Auth. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const textContent = `
    Password Reset Request - Nemo Auth
    
    Hello ${firstName},
    
    We received a request to reset your password for your Nemo Auth account.
    
    Click the link below to reset your password (valid for 60 minutes):
    
    ${resetUrl}
    
    If you didn't request a password reset, please ignore this email.
    Your password will remain unchanged until you create a new one.
    
    For security reasons, never share this link with anyone.
    
    ---
    Nemo Auth - Enterprise Authentication System
    This is an automated message, please do not reply to this email.
  `;
  
  try {
    const info = await transporter.sendMail({
      from: getSender(),
      to: email,
      subject: 'Reset Your Password - Nemo Auth',
      html: htmlContent,
      text: textContent,
      replyTo: null,
    });
    console.log('[PASSWORD RESET EMAIL] Sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('[PASSWORD RESET EMAIL] Send error:', error);
    return false;
  }
}