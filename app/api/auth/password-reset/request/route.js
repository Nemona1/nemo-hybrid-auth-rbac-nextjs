import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email/passwordResetEmail'; // Fixed import
import { logSecurityEvent } from '@/lib/auth/security';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Always return success even if user not found (security best practice)
    if (user) {
      const passwordResetToken = crypto.randomBytes(32).toString('hex');
      const passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { email: normalizedEmail },
        data: {
          passwordResetToken,
          passwordResetExpiry
        }
      });

      // Get base URL without port for Codespaces
      let baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      if (baseUrl.includes(':3000') && baseUrl.includes('.app.github.dev')) {
        baseUrl = baseUrl.replace(':3000', '');
      }
      
      const resetUrl = `${baseUrl}/reset-password/${passwordResetToken}`;
      
      const emailSent = await sendPasswordResetEmail(normalizedEmail, passwordResetToken, user.firstName);

      await logSecurityEvent({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUEST',
        details: { emailSent, resetUrl },
        success: emailSent,
        req: request
      });
    }

    // Always return success message (security best practice - don't reveal if email exists)
    return NextResponse.json({
      success: true,
      message: 'If that email address is registered, you will receive a password reset link shortly.'
    });
    
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}