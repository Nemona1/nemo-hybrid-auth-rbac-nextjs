import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email/sendEmail';
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

      const emailSent = await sendPasswordResetEmail(normalizedEmail, passwordResetToken, user.firstName);

      await logSecurityEvent({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUEST',
        details: { emailSent },
        success: emailSent,
        req: request
      });
    }

    return NextResponse.json({
      success: true,
      message: 'If that email address is registered, you will receive a password reset link shortly.'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
