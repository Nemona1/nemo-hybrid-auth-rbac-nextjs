import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(email, token, firstName) {
  // Force the correct URL with -3000
  const baseUrl = 'https://shiny-garbanzo-5gpqjp5j95v5h7xjp-3000.app.github.dev';
  const verificationUrl = `${baseUrl}/api/auth/verify/${token}`;
  
  console.log('[EMAIL] Base URL (forced):', baseUrl);
  console.log('[EMAIL] Verification URL:', verificationUrl);
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">
        <div style="background: #0EA5E9; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Nemo Auth</h1>
        </div>
        <div style="padding: 30px;">
          <h2>Hello ${firstName},</h2>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Verify Email</a>
          </div>
          <p style="font-size: 12px; color: #666;">This link expires in 24 hours.</p>
          <hr>
          <p style="font-size: 11px; color: #999;">Or copy this link:</p>
          <p style="font-size: 11px; color: #0EA5E9; word-break: break-all;">${verificationUrl}</p>
        </div>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>Nemo Auth - Enterprise Authentication System</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    await transporter.sendMail({
      from: `"Nemo Auth" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify Your Email - Nemo Auth',
      html: htmlContent,
    });
    console.log('[EMAIL] Sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('[EMAIL] Error:', error);
    return false;
  }
}