// Email Service with Nodemailer
// Handles verification emails and role decision notifications

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
});

/**
 * Send verification email to user
 */
export async function sendVerificationEmail(email, token, firstName) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/verify/${token}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Nemo Auth</h1>
        </div>
        <div class="content">
          <h2>Hello ${firstName}!</h2>
          <p>Thank you for registering. Please verify your email address to complete your registration.</p>
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </div>
          <p>Or copy and paste this link:</p>
          <p style="background: #e5e7eb; padding: 10px; border-radius: 4px; word-break: break-all;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Nemo Auth. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Verify Your Email - Nemo Auth',
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email, token, firstName) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${token}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { padding: 24px; background: white; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; }
        .button { display: inline-block; padding: 14px 24px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .code { font-family: 'Courier New', monospace; background: #e2e8f0; padding: 12px; border-radius: 8px; word-break: break-all; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hello ${firstName},</h2>
          <p>We received a request to reset your password. Click the button below to choose a new password. This link is valid for 60 minutes.</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          <p>If the button doesn't work, copy and paste this URL into your browser:</p>
          <p class="code">${resetUrl}</p>
          <p>If you did not request a password reset, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; 2026 Nemo Auth. Secure enterprise identity.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Reset Your Password - Nemo Auth',
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

/**
 * Send role approval/rejection email
 */
export async function sendRoleDecisionEmail(email, firstName, roleName, status, reason) {
  const statusText = status === 'APPROVED' ? 'Approved' : 'Rejected';
  const statusColor = status === 'APPROVED' ? '#10B981' : '#EF4444';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .status { color: ${statusColor}; font-weight: bold; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Role Application ${statusText}</h1>
        </div>
        <div class="content">
          <h2>Hello ${firstName},</h2>
          <p>Your application for the <strong>${roleName}</strong> role has been <span class="status">${statusText}</span>.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          ${status === 'APPROVED' ? '<p>You can now access all features associated with your role. Please log in to continue.</p>' : '<p>If you believe this is an error, please contact your system administrator.</p>'}
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXTAUTH_URL}/login" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Login to Your Account</a>
          </div>
        </div>
        <div class="footer">
          <p>&copy; 2024 Nemo Auth. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Role Application ${statusText} - Nemo Auth`,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}