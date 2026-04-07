import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validatePasswordStrength, hashPassword, logSecurityEvent } from '@/lib/auth/security';

export async function POST(request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired password reset link' }, { status: 400 });
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: 'Password too weak', details: passwordValidation.errors },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        refreshTokenVersion: { increment: 1 },
        failedLoginAttempts: 0,
        lockoutUntil: null
      }
    });

    await logSecurityEvent({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETE',
      details: {},
      success: true,
      req: request
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.'
    });
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
