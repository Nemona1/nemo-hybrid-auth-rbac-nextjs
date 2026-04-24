import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, handleFailedLogin, resetFailedAttempts, logSecurityEvent } from '@/lib/auth/security';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import { createAuditLog } from '@/lib/audit';
import { logSecurityEvent as logSecurity, SecurityActions } from '@/lib/security-log';
import { generateOtp, storeOtp, generateDeviceFingerprint } from '@/lib/auth/2fa';
import { send2faOtpEmail } from '@/lib/email/send2faOtp';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    console.log('[LOGIN] Attempting login for:', email);
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }
    
    // Find user with role
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });
    
    if (!user) {
      console.log('[LOGIN] User not found:', email);
      
      // Log security event for failed login (user not found)
      await logSecurity({
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
    
    // Check lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingSeconds = Math.ceil((user.lockoutUntil - new Date()) / 1000);
      console.log('[LOGIN] Account locked:', remainingSeconds);
      
      // Log security event for locked account attempt
      await logSecurity({
        userId: user.id,
        action: SecurityActions.LOGIN_FAILED,
        ipAddress,
        userAgent,
        details: { email, reason: 'Account locked', remainingSeconds },
        success: false
      });
      
      return NextResponse.json(
        { error: `Account locked. Try again in ${remainingSeconds} seconds`, locked: true, lockoutTime: remainingSeconds },
        { status: 429 }
      );
    }
    
    // Check email verification
    if (!user.isVerified) {
      console.log('[LOGIN] Email not verified:', email);
      
      await logSecurity({
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
    
    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    
    if (!isValid) {
      console.log('[LOGIN] Invalid password for:', email);
      const result = await handleFailedLogin(email, ipAddress, userAgent);
      
      // Log security event for failed password
      await logSecurity({
        userId: user.id,
        action: SecurityActions.LOGIN_FAILED,
        ipAddress,
        userAgent,
        details: { email, reason: 'Invalid password', attempts: result.remainingAttempts },
        success: false
      });
      
      if (result.locked) {
        // Log account lockout event
        await logSecurity({
          userId: user.id,
          action: SecurityActions.ACCOUNT_LOCKED,
          ipAddress,
          userAgent,
          details: { reason: 'Too many failed login attempts', lockoutTime: result.lockoutTime },
          success: false
        });
        
        return NextResponse.json(
          { error: `Too many failed attempts. Account locked for ${result.lockoutTime} seconds`, locked: true, lockoutTime: result.lockoutTime },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: 'Invalid credentials', remainingAttempts: result.remainingAttempts },
        { status: 401 }
      );
    }
    
    // Reset failed attempts
    await resetFailedAttempts(email);
    
    // ============================================================
    // TWO-FACTOR AUTHENTICATION CHECK
    // ============================================================
    
    if (user.twoFactorEnabled) {
      console.log('[LOGIN] 2FA enabled for user:', email);
      
      // Generate OTP
      const otp = generateOtp();
      storeOtp(user.id, otp);
      
      // Log security event for 2FA code sent
      await logSecurity({
        userId: user.id,
        action: SecurityActions.TWO_FACTOR_CODE_SENT,
        ipAddress,
        userAgent,
        details: { email: user.email, method: 'EMAIL_OTP' },
        success: true
      });
      
      // Send OTP email
      const emailSent = await send2faOtpEmail(user.email, otp, user.firstName);
      
      if (!emailSent) {
        await logSecurity({
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
      
      // Check if device is trusted
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
      
      // Create temporary session for 2FA
      const tempSession = Buffer.from(JSON.stringify({
        userId: user.id,
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
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
    
    // ============================================================
    // NORMAL LOGIN (NO 2FA)
    // ============================================================
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Determine redirect URL based on role and application status
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
      } else {
        redirectUrl = '/role-request';
      }
    }
    
    console.log('[LOGIN] Successful for:', email, 'Redirect:', redirectUrl);
    
    // Log security event for successful login
    await logSecurity({
      userId: user.id,
      action: SecurityActions.LOGIN_SUCCESS,
      ipAddress,
      userAgent,
      details: { email, redirectUrl, twoFactorEnabled: false },
      success: true
    });
    
    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'user',
      resourceId: user.id,
      details: { email, redirectUrl },
      ipAddress,
      userAgent
    });
    
    // Create response
    const response = NextResponse.json({
      success: true,
      accessToken: accessToken,
      refreshToken: refreshToken,
      redirectUrl: redirectUrl,
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
    
    // Set cookies
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