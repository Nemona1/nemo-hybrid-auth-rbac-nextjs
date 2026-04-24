import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, handleFailedLogin, resetFailedAttempts } from '@/lib/auth/security';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import { createAuditLog } from '@/lib/audit';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { generateOtp, storeOtp, generateDeviceFingerprint } from '@/lib/auth/2fa';
import { send2faOtpEmail } from '@/lib/email/send2faOtp';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });
    
    if (!user) {
      await logSecurityEvent({
        userId: null,
        action: SecurityActions.LOGIN_FAILED,
        ipAddress,
        userAgent,
        details: { email, reason: 'User not found' },
        success: false
      });
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingSeconds = Math.ceil((user.lockoutUntil - new Date()) / 1000);
      
      await logSecurityEvent({
        userId: user.id,
        action: SecurityActions.LOGIN_FAILED,
        ipAddress,
        userAgent,
        details: { email, reason: 'Account locked', remainingSeconds },
        success: false
      });
      
      // In your API route
      return NextResponse.json(
        { 
          success: false, 
          error: `Account locked. Try again in ${remainingSeconds} seconds`, 
          locked: true, 
          lockoutTime: remainingSeconds 
        },
        { status: 200 } // ← Return 200 instead of 429
      );
    }
    
    if (!user.isVerified) {
      await logSecurityEvent({
        userId: user.id,
        action: SecurityActions.LOGIN_FAILED,
        ipAddress,
        userAgent,
        details: { email, reason: 'Email not verified' },
        success: false
      });
      
      return NextResponse.json(
        { error: 'Please verify your email before logging in' },
        { status: 401 }
      );
    }
    
    const isValid = await verifyPassword(password, user.passwordHash);
    
    if (!isValid) {
      const result = await handleFailedLogin(email, ipAddress, userAgent);
      
      await logSecurityEvent({
        userId: user.id,
        action: SecurityActions.LOGIN_FAILED,
        ipAddress,
        userAgent,
        details: { email, reason: 'Invalid password', attempts: result.remainingAttempts },
        success: false
      });
      
      if (result.locked) {
        await logSecurityEvent({
          userId: user.id,
          action: SecurityActions.ACCOUNT_LOCKED,
          ipAddress,
          userAgent,
          details: { reason: 'Too many failed login attempts', lockoutTime: result.lockoutTime },
          success: false
        });
        
        return NextResponse.json(
          { error: `Too many failed attempts. Account locked for ${result.lockoutTime} seconds`, 
          locked: true, 
          lockoutTime: result.lockoutTime },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        { error: 'Invalid credentials', remainingAttempts: result.remainingAttempts },
        { status: 401 }
      );
    }
    
    await resetFailedAttempts(email);
    
    // TWO-FACTOR AUTHENTICATION CHECK
    if (user.twoFactorEnabled) {
      const otp = generateOtp();
      await storeOtp(user.id, otp);
      
      await logSecurityEvent({
        userId: user.id,
        action: SecurityActions.TWO_FACTOR_CODE_SENT,
        ipAddress,
        userAgent,
        details: { email: user.email, method: 'EMAIL_OTP' },
        success: true
      });
      
      const emailSent = await send2faOtpEmail(user.email, otp, user.firstName);
      
      if (!emailSent) {
        await logSecurityEvent({
          userId: user.id,
          action: SecurityActions.TWO_FACTOR_CODE_SENT,
          ipAddress,
          userAgent,
          details: { email: user.email, reason: 'Email send failed' },
          success: false
        });
        
        return NextResponse.json(
          { error: 'Failed to send verification code. Please try again.' },
          { status: 500 }
        );
      }
      
      let isTrustedDevice = false;
      const deviceId = generateDeviceFingerprint(userAgent, ipAddress);
      
      const trustedDevice = await prisma.trustedDevice.findFirst({
        where: {
          userId: user.id,
          deviceId,
          expiresAt: { gt: new Date() }
        }
      });
      
      if (trustedDevice) {
        isTrustedDevice = true;
        await prisma.trustedDevice.update({
          where: { id: trustedDevice.id },
          data: { lastUsedAt: new Date() }
        });
      }
      
      const tempSession = Buffer.from(JSON.stringify({
        userId: user.id,
        expiresAt: Date.now() + 10 * 60 * 1000
      })).toString('base64');
      
      const isProduction = process.env.NODE_ENV === 'production';
      
      const twoFactorResponse = NextResponse.json({
        requiresTwoFactor: true,
        message: 'Two-factor authentication required. A verification code has been sent to your email.',
        isTrustedDevice
      });
      
      twoFactorResponse.cookies.set('temp2faSession', tempSession, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 10 * 60
      });
      
      await createAuditLog({
        userId: user.id,
        action: '2FA_CODE_SENT',
        resourceType: 'user',
        resourceId: user.id,
        details: { email: user.email },
        ipAddress,
        userAgent
      });
      
      return twoFactorResponse;
    }
    
    // NORMAL LOGIN (NO 2FA)
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    let redirectUrl = '/role-request';
    
    if (user.applicationStatus === 'APPROVED') {
      if (user.role?.name === 'ADMIN') {
        redirectUrl = '/dashboard/admin';
      } else if (user.role?.name === 'MANAGER') {
        redirectUrl = '/dashboard/manager';
      } else if (user.role?.name === 'EDITOR') {
        redirectUrl = '/dashboard/editor';
      } else if (user.role?.name === 'VIEWER') {
        redirectUrl = '/dashboard/viewer';
      }
    }
    
    await logSecurityEvent({
      userId: user.id,
      action: SecurityActions.LOGIN_SUCCESS,
      ipAddress,
      userAgent,
      details: { email, redirectUrl, twoFactorEnabled: false },
      success: true
    });
    
    await createAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'user',
      resourceId: user.id,
      details: { email, redirectUrl },
      ipAddress,
      userAgent
    });
    
    const response = NextResponse.json({
      success: true,
      accessToken,
      refreshToken,
      redirectUrl,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        applicationStatus: user.applicationStatus,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60
    });
    
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    });
    
    return response;
    
  } catch (error) {
    console.error('[LOGIN] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}