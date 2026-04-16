import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/security';
import { createAuditLog } from '@/lib/audit';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
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
    
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
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
        
        // Log security event for account lockout
        await logSecurityEvent({
          userId: user.id,
          action: SecurityActions.ACCOUNT_LOCKED,
          ipAddress,
          userAgent,
          details: { reason: 'Too many failed OTP attempts', attempts: newAttempts },
          success: false
        });
        
        await sendSecurityAlertEmail(user.email, user.firstName, 'otp_verification_failed', {
          attempts: newAttempts,
          ipAddress,
          userAgent
        });
      }
      
      await prisma.user.update({
        where: { id: decoded.userId },
        data: {
          passwordChangeOtpAttempts: newAttempts,
          passwordChangeOtpLockout: lockoutUntil
        }
      });
      
      // Log security event for failed OTP
      await logSecurityEvent({
        userId: decoded.userId,
        action: SecurityActions.PASSWORD_CHANGE_OTP_FAILED,
        ipAddress,
        userAgent,
        details: { attempts: newAttempts, locked: !!lockoutUntil },
        success: false
      });
      
      await createAuditLog({
        userId: decoded.userId,
        action: 'PASSWORD_CHANGE_OTP_FAILED',
        resourceType: 'user',
        resourceId: decoded.userId,
        details: { attempts: newAttempts, locked: !!lockoutUntil },
        ipAddress,
        userAgent
      });
      
      return NextResponse.json({ 
        error: newAttempts >= 3 
          ? 'Too many failed attempts. Account temporarily locked.'
          : `Invalid verification code. ${3 - newAttempts} attempt(s) remaining.`,
        remainingAttempts: newAttempts >= 3 ? 0 : 3 - newAttempts
      }, { status: 400 });
    }
    
    // Reset OTP attempts on successful verification
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        passwordChangeOtpAttempts: 0,
        passwordChangeOtpLockout: null
      }
    });
    
    // Log security event for OTP verified successfully
    await logSecurityEvent({
      userId: decoded.userId,
      action: SecurityActions.PASSWORD_CHANGE_OTP_VERIFIED,
      ipAddress,
      userAgent,
      details: { otpVerified: true },
      success: true
    });
    
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
    
    // Log security event for successful password change
    await logSecurityEvent({
      userId: decoded.userId,
      action: SecurityActions.PASSWORD_CHANGED_SUCCESSFULLY,
      ipAddress,
      userAgent,
      details: { method: 'OTP_VERIFIED', allSessionsInvalidated: true },
      success: true
    });
    
    // Send password changed confirmation email
    await sendPasswordChangedEmail(user.email, user.firstName);
    
    await createAuditLog({
      userId: decoded.userId,
      action: 'PASSWORD_CHANGED_SUCCESSFULLY',
      resourceType: 'user',
      resourceId: decoded.userId,
      details: { method: 'OTP_VERIFIED' },
      ipAddress,
      userAgent
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