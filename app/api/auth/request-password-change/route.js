import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken, verifyPassword } from '@/lib/auth';
import { sendPasswordChangeOtp } from '@/lib/email/sendOtpEmail';
import { createAuditLog } from '@/lib/audit';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { currentPassword } = await request.json();
    
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
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
        error: `Too many failed OTP attempts. Account locked for ${remainingSeconds} seconds.`,
        locked: true,
        remainingSeconds
      }, { status: 429 });
    }
    
    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      // Increment failed attempts
      const newAttempts = (user.passwordChangeOtpAttempts || 0) + 1;
      let lockoutUntil = null;
      
      // Lock after 3 failed attempts
      if (newAttempts >= 3) {
        lockoutUntil = new Date(Date.now() + 60 * 1000); // 1 minute lockout
        
        // Log security event for account lockout
        await logSecurityEvent({
          userId: user.id,
          action: SecurityActions.ACCOUNT_LOCKED,
          ipAddress,
          userAgent,
          details: { reason: 'Too many failed password change attempts', attempts: newAttempts },
          success: false
        });
        
        // Send security alert email
        await sendSecurityAlertEmail(user.email, user.firstName, 'password_change_attempt', {
          attempts: newAttempts,
          ipAddress: ipAddress,
          userAgent: userAgent
        });
      }
      
      await prisma.user.update({
        where: { id: decoded.userId },
        data: {
          passwordChangeOtpAttempts: newAttempts,
          passwordChangeOtpLockout: lockoutUntil
        }
      });
      
      // Log security event for failed password verification
      await logSecurityEvent({
        userId: decoded.userId,
        action: SecurityActions.PASSWORD_CHANGE_FAILED_CURRENT_PASSWORD,
        ipAddress,
        userAgent,
        details: { attempts: newAttempts, locked: !!lockoutUntil },
        success: false
      });
      
      await createAuditLog({
        userId: decoded.userId,
        action: 'PASSWORD_CHANGE_FAILED_CURRENT_PASSWORD',
        resourceType: 'user',
        resourceId: decoded.userId,
        details: { attempts: newAttempts, locked: !!lockoutUntil },
        ipAddress: ipAddress,
        userAgent: userAgent
      });
      
      const remainingAttempts = 3 - newAttempts;
      return NextResponse.json({ 
        error: remainingAttempts > 0 
          ? `Current password is incorrect. ${remainingAttempts} attempt(s) remaining before lockout.`
          : 'Current password is incorrect. Account temporarily locked due to too many failed attempts.',
        remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0
      }, { status: 401 });
    }
    
    // Reset OTP attempts on successful password verification
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        passwordChangeOtpAttempts: 0,
        passwordChangeOtpLockout: null
      }
    });
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Store OTP in database
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        passwordChangeOtp: otp,
        passwordChangeOtpExpiry: otpExpiry
      }
    });
    
    // Send OTP email
    const emailSent = await sendPasswordChangeOtp(user.email, otp, user.firstName);
    
    if (!emailSent) {
      // Log security event for failed OTP send
      await logSecurityEvent({
        userId: decoded.userId,
        action: SecurityActions.PASSWORD_CHANGE_OTP_SENT,
        ipAddress,
        userAgent,
        details: { emailSent: false, reason: 'Email send failed' },
        success: false
      });
      
      return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
    }
    
    // Log security event for OTP sent successfully
    await logSecurityEvent({
      userId: decoded.userId,
      action: SecurityActions.PASSWORD_CHANGE_OTP_SENT,
      ipAddress,
      userAgent,
      details: { emailSent: true, expiryMinutes: 10 },
      success: true
    });
    
    await createAuditLog({
      userId: decoded.userId,
      action: 'PASSWORD_CHANGE_OTP_SENT',
      resourceType: 'user',
      resourceId: decoded.userId,
      details: { expiryMinutes: 10 },
      ipAddress: ipAddress,
      userAgent: userAgent
    });
    
    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
      expiresIn: 10 // minutes
    });
    
  } catch (error) {
    console.error('Request password change error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}