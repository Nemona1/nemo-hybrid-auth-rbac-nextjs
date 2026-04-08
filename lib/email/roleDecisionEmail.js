// Role Decision Email Service
// Handles role approval/rejection notifications

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
  debug: false,
  logger: false,
});

/**
 * Get formatted sender email with name
 */
const getSender = () => {
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;
  return `"Nemo Auth" <${fromEmail}>`;
};

/**
 * Send role approval email
 */
export async function sendRoleApprovalEmail(email, firstName, roleName, approvedBy, approvedAt) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  console.log('[ROLE DECISION EMAIL] Sending approval to:', email);
  console.log('[ROLE DECISION EMAIL] Role:', roleName);
  
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
          background: linear-gradient(135deg, #10b981, #059669);
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
        .role-badge {
          display: inline-block;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          margin: 16px 0;
        }
        .button {
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(135deg, #0ea5e9, #3b82f6);
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
        .footer {
          text-align: center;
          padding: 24px;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          margin-top: 24px;
        }
        .info-box {
          background: #f0fdf4;
          border-left: 4px solid #10b981;
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
          <p>Role Application Approved</p>
        </div>
        <div class="content">
          <h2>Congratulations ${firstName}! 🎉</h2>
          <p>Your role application has been <strong style="color: #10b981;">APPROVED</strong>.</p>
          
          <div style="text-align: center;">
            <span class="role-badge">${roleName}</span>
          </div>
          
          <div class="info-box">
            <strong>📋 Application Details:</strong><br>
            Approved by: ${approvedBy}<br>
            Approved on: ${new Date(approvedAt).toLocaleString()}
          </div>
          
          <p>You now have access to:</p>
          <ul>
            <li>All features associated with the ${roleName} role</li>
            <li>Role-specific dashboard and tools</li>
            <li>Enhanced permissions and capabilities</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${baseUrl}/dashboard" class="button">Go to Dashboard</a>
          </div>
          
          <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
            If you have any questions about your new role permissions, please contact your system administrator.
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
    Role Application Approved - Nemo Auth
    
    Congratulations ${firstName}!
    
    Your role application has been APPROVED.
    
    Role: ${roleName}
    Approved by: ${approvedBy}
    Approved on: ${new Date(approvedAt).toLocaleString()}
    
    You now have access to all features associated with the ${roleName} role.
    
    Log in to your dashboard to get started:
    ${baseUrl}/dashboard
    
    ---
    Nemo Auth - Enterprise Authentication System
    This is an automated message, please do not reply to this email.
  `;
  
  try {
    const info = await transporter.sendMail({
      from: getSender(),
      to: email,
      subject: `Role Application Approved - ${roleName} Role`,
      html: htmlContent,
      text: textContent,
      replyTo: null,
    });
    console.log('[ROLE DECISION EMAIL] Approval sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('[ROLE DECISION EMAIL] Approval send error:', error);
    return false;
  }
}

/**
 * Send role rejection email
 */
export async function sendRoleRejectionEmail(email, firstName, roleName, rejectedBy, rejectedAt, reason) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  console.log('[ROLE DECISION EMAIL] Sending rejection to:', email);
  console.log('[ROLE DECISION EMAIL] Role:', roleName);
  console.log('[ROLE DECISION EMAIL] Reason:', reason);
  
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
          background: linear-gradient(135deg, #ef4444, #dc2626);
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
        .role-badge {
          display: inline-block;
          background: #e2e8f0;
          color: #475569;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          margin: 16px 0;
        }
        .button {
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(135deg, #0ea5e9, #3b82f6);
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
        .footer {
          text-align: center;
          padding: 24px;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          margin-top: 24px;
        }
        .reason-box {
          background: #fef2f2;
          border-left: 4px solid #ef4444;
          padding: 12px;
          margin: 20px 0;
          font-size: 13px;
          border-radius: 4px;
        }
        .info-box {
          background: #f8fafc;
          border-left: 4px solid #64748b;
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
          <p>Role Application Update</p>
        </div>
        <div class="content">
          <h2>Hello ${firstName},</h2>
          <p>Your role application has been <strong style="color: #ef4444;">REJECTED</strong>.</p>
          
          <div style="text-align: center;">
            <span class="role-badge">${roleName}</span>
          </div>
          
          ${reason ? `
          <div class="reason-box">
            <strong>❌ Rejection Reason:</strong><br>
            ${reason}
          </div>
          ` : ''}
          
          <div class="info-box">
            <strong>📋 Application Details:</strong><br>
            Reviewed by: ${rejectedBy}<br>
            Reviewed on: ${new Date(rejectedAt).toLocaleString()}
          </div>
          
          <p>What you can do next:</p>
          <ul>
            <li>Review the rejection reason above</li>
            <li>Submit a new application with additional justification</li>
            <li>Contact your system administrator for guidance</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${baseUrl}/role-request" class="button">Submit New Application</a>
          </div>
          
          <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
            If you believe this decision was made in error, please contact your system administrator.
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
    Role Application Update - Nemo Auth
    
    Hello ${firstName},
    
    Your application for the ${roleName} role has been REJECTED.
    
    ${reason ? `Rejection Reason: ${reason}` : ''}
    
    Reviewed by: ${rejectedBy}
    Reviewed on: ${new Date(rejectedAt).toLocaleString()}
    
    What you can do next:
    - Review the rejection reason
    - Submit a new application with additional justification
    - Contact your system administrator for guidance
    
    Submit a new application:
    ${baseUrl}/role-request
    
    ---
    Nemo Auth - Enterprise Authentication System
    This is an automated message, please do not reply to this email.
  `;
  
  try {
    const info = await transporter.sendMail({
      from: getSender(),
      to: email,
      subject: `Role Application Update - ${roleName} Role`,
      html: htmlContent,
      text: textContent,
      replyTo: null,
    });
    console.log('[ROLE DECISION EMAIL] Rejection sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('[ROLE DECISION EMAIL] Rejection send error:', error);
    return false;
  }
}