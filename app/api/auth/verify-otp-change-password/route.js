import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/security';
import { createAuditLog } from '@/lib/audit';
import { sendPasswordChangedEmail, sendSecurityAlertEmail } from '@/lib/email/sendOtpEmail';

export async function POST(request) {
  try {
    const { otp, newPassword } = await request.json();
    
    if (!otp || !newPassword) {
      return NextResponse.json(
        { error: 'Verification code and new password are required' },
        { status: 400 }
      );
    }
    
    let token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      token = request.cookies.get('accessToken')?.value;
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid, decoded } = await verifyAccessToken(token);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if user is locked out from OTP attempts
    if (user.passwordChangeOtpLockout && user.passwordChangeOtpLockout > new Date()) {
      const remainingSeconds = Math.ceil((user.passwordChangeOtpLockout - new Date()) / 1000);
      return NextResponse.json({ 
        error: `Too many failed attempts. Account locked for ${remainingSeconds} seconds.`,
        locked: true,
        remainingSeconds
      }, { status: 429 });
    }
    
    // Check OTP expiry
    if (user.passwordChangeOtpExpiry && user.passwordChangeOtpExpiry < new Date()) {
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }
    
    // Verify OTP
    if (user.passwordChangeOtp !== otp) {
      const newAttempts = (user.passwordChangeOtpAttempts || 0) + 1;
      let lockoutUntil = null;
      
      if (newAttempts >= 3) {
        lockoutUntil = new Date(Date.now() + 60 * 1000);
        
        await sendSecurityAlertEmail(user.email, user.firstName, 'otp_verification_failed', {
          attempts: newAttempts,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        });
      }
      
      await prisma.user.update({
        where: { id: decoded.userId },
        data: {
          passwordChangeOtpAttempts: newAttempts,
          passwordChangeOtpLockout: lockoutUntil
        }
      });
      
      await createAuditLog({
        userId: decoded.userId,
        action: 'PASSWORD_CHANGE_OTP_FAILED',
        resourceType: 'user',
        resourceId: decoded.userId,
        details: { attempts: newAttempts, locked: !!lockoutUntil },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });
      
      return NextResponse.json({ 
        error: newAttempts >= 3 
          ? 'Too many failed attempts. Account temporarily locked.'
          : `Invalid verification code. ${3 - newAttempts} attempt(s) remaining.`,
        remainingAttempts: newAttempts >= 3 ? 0 : 3 - newAttempts
      }, { status: 400 });
    }
    
    // Validate new password strength
    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors[0] }, { status: 400 });
    }
    
    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);
    
    // Update password and clear OTP data
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangeOtp: null,
        passwordChangeOtpExpiry: null,
        passwordChangeOtpAttempts: 0,
        passwordChangeOtpLockout: null,
        refreshTokenVersion: { increment: 1 } // Invalidate all existing sessions
      }
    });
    
    // Send password changed confirmation email
    await sendPasswordChangedEmail(user.email, user.firstName);
    
    await createAuditLog({
      userId: decoded.userId,
      action: 'PASSWORD_CHANGED_SUCCESSFULLY',
      resourceType: 'user',
      resourceId: decoded.userId,
      details: { method: 'OTP_VERIFIED' },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
    
    return NextResponse.json({
      success: true,
      message: 'Password changed successfully. You will be redirected to login.'
    });
    
  } catch (error) {
    console.error('Verify OTP and change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}