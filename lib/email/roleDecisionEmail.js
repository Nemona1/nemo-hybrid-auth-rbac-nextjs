// Role Decision Email Service
// Handles role approval/rejection notifications and application submission confirmation

import nodemailer from 'nodemailer';

// Configure transporter with security best practices
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
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  }
});

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
 * Send role application submitted confirmation email
 */
export async function sendRoleApplicationSubmittedEmail(email, firstName, roleName, applicationId) {
  const baseUrl = getBaseUrl();
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Application Submitted - Nemo Auth</title>
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
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #0ea5e9, #3b82f6);
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 32px;
          font-weight: 700;
        }
        .header p {
          color: rgba(255,255,255,0.9);
          margin: 10px 0 0;
        }
        .content {
          padding: 40px 30px;
        }
        .success-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          font-size: 40px;
        }
        .role-badge {
          display: inline-block;
          background: linear-gradient(135deg, #0ea5e9, #3b82f6);
          color: white;
          padding: 8px 20px;
          border-radius: 50px;
          font-weight: 600;
          margin: 20px 0;
        }
        .info-box {
          background: #f0fdf4;
          border-left: 4px solid #10b981;
          padding: 16px;
          border-radius: 8px;
          margin: 24px 0;
        }
        .button {
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(135deg, #0ea5e9, #3b82f6);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
        }
        .footer {
          background: #f8fafc;
          padding: 24px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
        }
        .security-note {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 12px;
          margin: 20px 0;
          font-size: 13px;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nemo Auth</h1>
          <p>Enterprise Authentication System</p>
        </div>
        <div class="content">
          <div class="success-icon">📋</div>
          <h2 style="text-align: center; margin-bottom: 16px;">Application Submitted! ✅</h2>
          <p>Dear <strong>${firstName}</strong>,</p>
          <p>Your application for the <strong>${roleName}</strong> role has been successfully submitted.</p>
          
          <div style="text-align: center;">
            <span class="role-badge">${roleName}</span>
          </div>
          
          <div class="info-box">
            <strong>📋 Application ID:</strong> ${applicationId}<br>
            <strong>Status:</strong> Pending Review<br>
            <strong>Submitted:</strong> ${new Date().toLocaleString()}
          </div>
          
          <p><strong>What happens next?</strong></p>
          <ul>
            <li>✓ An administrator will review your application</li>
            <li>✓ You will receive an email notification once a decision is made</li>
            <li>✓ You can check the status anytime in your dashboard</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${baseUrl}/role-request" class="button">Track Application Status</a>
          </div>
          
          <div class="security-note">
            <strong>🔒 Security Notice:</strong> This is an automated notification. Please do not reply to this email.
          </div>
        </div>
        <div class="footer">
          <p><strong>Nemo Auth</strong> - Enterprise Authentication System</p>
          <p>&copy; ${new Date().getFullYear()} Nemo Auth. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    await transporter.sendMail({
      from: getSender(),
      to: email,
      subject: `Role Application Submitted - ${roleName}`,
      html: htmlContent,
      replyTo: null,
    });
    console.log('[EMAIL] Application submitted confirmation sent to:', email);
    return true;
  } catch (error) {
    console.error('[EMAIL] Application submitted email error:', error);
    return false;
  }
}

/**
 * Send role approval email
 */
export async function sendRoleApprovalEmail(email, firstName, roleName, approvedBy, approvedAt) {
  const baseUrl = getBaseUrl();
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Role Application Approved - Nemo Auth</title>
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
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #10b981, #059669);
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 32px;
        }
        .content {
          padding: 40px 30px;
        }
        .success-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          font-size: 40px;
        }
        .role-badge {
          display: inline-block;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 8px 20px;
          border-radius: 50px;
          font-weight: 600;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(135deg, #0ea5e9, #3b82f6);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
        }
        .footer {
          background: #f8fafc;
          padding: 24px;
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
          <p>Role Application Approved</p>
        </div>
        <div class="content">
          <div class="success-icon">🎉</div>
          <h2 style="text-align: center;">Congratulations ${firstName}!</h2>
          <p>Your role application has been <strong style="color: #10b981;">APPROVED</strong>.</p>
          
          <div style="text-align: center;">
            <span class="role-badge">${roleName}</span>
          </div>
          
          <p><strong>What's changed?</strong></p>
          <ul>
            <li>✅ Access to ${roleName}-specific features and tools</li>
            <li>✅ Enhanced permissions based on your role</li>
            <li>✅ Personalized dashboard with role-specific insights</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${baseUrl}/dashboard" class="button">Go to Dashboard</a>
          </div>
        </div>
        <div class="footer">
          <p><strong>Nemo Auth</strong> - Enterprise Authentication System</p>
          <p>Approved by: ${approvedBy} on ${new Date(approvedAt).toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    await transporter.sendMail({
      from: getSender(),
      to: email,
      subject: `✅ Role Application Approved - ${roleName}`,
      html: htmlContent,
      replyTo: null,
    });
    console.log('[EMAIL] Approval email sent to:', email);
    return true;
  } catch (error) {
    console.error('[EMAIL] Approval email error:', error);
    return false;
  }
}

/**
 * Send role rejection email
 */
export async function sendRoleRejectionEmail(email, firstName, roleName, rejectedBy, rejectedAt, reason) {
  const baseUrl = getBaseUrl();
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Role Application Update - Nemo Auth</title>
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
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 32px;
        }
        .content {
          padding: 40px 30px;
        }
        .button {
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(135deg, #0ea5e9, #3b82f6);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .reason-box {
          background: #fef2f2;
          border-left: 4px solid #ef4444;
          padding: 16px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .footer {
          background: #f8fafc;
          padding: 24px;
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
          <p>Role Application Update</p>
        </div>
        <div class="content">
          <h2>Hello ${firstName},</h2>
          <p>Your application for the <strong>${roleName}</strong> role has been <strong style="color: #ef4444;">REJECTED</strong>.</p>
          
          ${reason ? `
          <div class="reason-box">
            <strong>❌ Reason for rejection:</strong><br>
            ${reason}
          </div>
          ` : ''}
          
          <p><strong>What you can do:</strong></p>
          <ul>
            <li>Review the feedback provided above</li>
            <li>Submit a new application with additional justification</li>
            <li>Contact support if you need clarification</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${baseUrl}/role-request" class="button">Submit New Application</a>
          </div>
        </div>
        <div class="footer">
          <p><strong>Nemo Auth</strong> - Enterprise Authentication System</p>
          <p>Reviewed by: ${rejectedBy} on ${new Date(rejectedAt).toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    await transporter.sendMail({
      from: getSender(),
      to: email,
      subject: `Role Application Update - ${roleName}`,
      html: htmlContent,
      replyTo: null,
    });
    console.log('[EMAIL] Rejection email sent to:', email);
    return true;
  } catch (error) {
    console.error('[EMAIL] Rejection email error:', error);
    return false;
  }
}