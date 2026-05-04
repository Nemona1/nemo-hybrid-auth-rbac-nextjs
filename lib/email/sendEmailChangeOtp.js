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

export async function sendEmailChangeOtp(email, otp, firstName) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://shiny-garbanzo-5gpqjp5j95v5h7xjp-3000.app.github.dev';
  
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
          <p>You have requested to change your email address. To proceed, please use the following verification code:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #0EA5E9;">
              ${otp}
            </div>
          </div>
          <p style="font-size: 14px; color: #333;">This code will expire in 10 minutes.</p>
          <p style="font-size: 12px; color: #666; margin-top: 20px;">
            If you did not request this change, please ignore this email or contact support.
          </p>
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
      subject: 'Email Change Verification Code - Nemo Auth',
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('[EMAIL] Send email change OTP error:', error);
    return false;
  }
}