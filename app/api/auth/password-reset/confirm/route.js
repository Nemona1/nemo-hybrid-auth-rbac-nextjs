import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validatePasswordStrength, hashPassword, logSecurityEvent } from '@/lib/auth/security';

export async function POST(request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    console.log('[PASSWORD RESET CONFIRM] Token received:', token ? 'yes' : 'no');

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() }
      }
    });

    if (!user) {
      console.log('[PASSWORD RESET CONFIRM] Invalid or expired token');
      return NextResponse.json({ error: 'Invalid or expired password reset link' }, { status: 400 });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.errors[0] },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user
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

    console.log('[PASSWORD RESET CONFIRM] Password reset successful for:', user.email);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.'
    });
    
  } catch (error) {
    console.error('[PASSWORD RESET CONFIRM] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}