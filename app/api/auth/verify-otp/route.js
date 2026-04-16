import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { sendSecurityAlertEmail } from '@/lib/email/sendOtpEmail';

export async function POST(request) {
  try {
    const { otp } = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    if (!otp) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
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
        error: `Too many failed OTP attempts. Account locked for ${remainingSeconds} seconds.`,
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
      // Increment failed OTP attempts
      const newAttempts = (user.passwordChangeOtpAttempts || 0) + 1;
      let lockoutUntil = null;
      let responseMessage = '';
      
      // Lock after 3 failed OTP attempts
      if (newAttempts >= 3) {
        lockoutUntil = new Date(Date.now() + 60 * 1000); // 1 minute lockout
        responseMessage = 'Account temporarily locked due to too many failed attempts.';
        
        // Log security event for account lockout
        await logSecurityEvent({
          userId: user.id,
          action: SecurityActions.ACCOUNT_LOCKED,
          ipAddress,
          userAgent,
          details: { reason: 'Too many failed OTP verification attempts', attempts: newAttempts },
          success: false
        });
        
        // Send security alert email
        await sendSecurityAlertEmail(user.email, user.firstName, 'otp_verification_failed', {
          attempts: newAttempts,
          ipAddress,
          userAgent
        });
      } else {
        responseMessage = `${3 - newAttempts} attempt(s) remaining before account lockout.`;
      }
      
      // Log security event for failed OTP
      await logSecurityEvent({
        userId: user.id,
        action: SecurityActions.PASSWORD_CHANGE_OTP_FAILED,
        ipAddress,
        userAgent,
        details: { attempts: newAttempts, locked: !!lockoutUntil },
        success: false
      });
      
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
        ipAddress,
        userAgent
      });
      
      return NextResponse.json({ 
        error: `Invalid verification code. ${responseMessage}`,
        remainingAttempts: newAttempts >= 3 ? 0 : 3 - newAttempts
      }, { status: 400 });
    }
    
    // Log security event for successful OTP verification
    await logSecurityEvent({
      userId: user.id,
      action: SecurityActions.PASSWORD_CHANGE_OTP_VERIFIED,
      ipAddress,
      userAgent,
      details: { otpVerified: true },
      success: true
    });
    
    // Reset OTP attempts on successful verification
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        passwordChangeOtpAttempts: 0,
        passwordChangeOtpLockout: null
      }
    });
    
    await createAuditLog({
      userId: decoded.userId,
      action: 'PASSWORD_CHANGE_OTP_VERIFIED',
      resourceType: 'user',
      resourceId: decoded.userId,
      details: { otpVerified: true },
      ipAddress,
      userAgent
    });
    
    return NextResponse.json({
      success: true,
      message: 'Code verified successfully'
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}