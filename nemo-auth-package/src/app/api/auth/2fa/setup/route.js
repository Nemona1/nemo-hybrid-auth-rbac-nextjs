import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken, rotateRefreshToken } from '@/lib/auth/jwt';
import { createAuditLog, AuditActions } from '@/lib/audit';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { generateOtp, storeOtp } from '@/lib/auth/2fa';
import { send2faOtpEmail } from '@/lib/email/send2faOtp';

export async function POST(request) {
  try {
    // Get token from Authorization header or cookie
    let token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      token = request.cookies.get('accessToken')?.value;
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let { valid, decoded } = await verifyAccessToken(token);
    let newTokens = null;
    
    // If token expired, try to refresh
    if (!valid) {
      console.log('[2FA Setup] Token expired, attempting refresh');
      const refreshToken = request.cookies.get('refreshToken')?.value;
      
      if (refreshToken) {
        const rotation = await rotateRefreshToken(refreshToken);
        if (rotation.success) {
          newTokens = rotation;
          const verification = await verifyAccessToken(rotation.accessToken);
          if (verification.valid) {
            valid = true;
            decoded = verification.decoded;
            token = rotation.accessToken;
            console.log('[2FA Setup] Token refreshed successfully');
          }
        }
      }
    }
    
    if (!valid || !decoded) {
      return NextResponse.json({ error: 'Session expired. Please login again.' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 });
    }
    
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Generate OTP
    const otp = generateOtp();
    await storeOtp(user.id, otp);
    
    // Send OTP email
    const emailSent = await send2faOtpEmail(user.email, otp, user.firstName);
    
    if (!emailSent) {
      return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
    }
    
    // Log security event (2FA setup initiated)
    await logSecurityEvent({
      userId: user.id,
      action: SecurityActions.TWO_FACTOR_SETUP_INITIATED,
      ipAddress,
      userAgent,
      details: { email: user.email },
      success: true
    });
    
    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: AuditActions['2FA_SETUP_INITIATED'],
      resourceType: 'user',
      resourceId: user.id,
      details: { method: 'EMAIL_OTP' },
      ipAddress,
      userAgent
    });
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Verification code sent to your email'
    });
    
    // If tokens were refreshed, set new cookies
    if (newTokens) {
      const isProduction = process.env.NODE_ENV === 'production';
      response.cookies.set('accessToken', newTokens.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60
      });
      response.cookies.set('refreshToken', newTokens.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60
      });
    }
    
    return response;
    
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}