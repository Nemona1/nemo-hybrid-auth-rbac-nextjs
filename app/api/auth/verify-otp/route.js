import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { sendSecurityAlertEmail } from '@/lib/email/sendOtpEmail';

export async function POST(request) {
  try {
    const { otp } = await request.json();
    
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
        
        // Send security alert email
        await sendSecurityAlertEmail(user.email, user.firstName, 'otp_verification_failed', {
          attempts: newAttempts,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        });
      } else {
        responseMessage = `${3 - newAttempts} attempt(s) remaining before account lockout.`;
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
        error: `Invalid verification code. ${responseMessage}`,
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
    
    await createAuditLog({
      userId: decoded.userId,
      action: 'PASSWORD_CHANGE_OTP_VERIFIED',
      resourceType: 'user',
      resourceId: decoded.userId,
      details: { otpVerified: true },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
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