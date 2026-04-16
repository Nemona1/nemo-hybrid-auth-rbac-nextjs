import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken, rotateRefreshToken } from '@/lib/auth/jwt';
import { verifyPassword } from '@/lib/auth/security';
import { createAuditLog, AuditActions } from '@/lib/audit';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';

export async function POST(request) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }
    
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
      console.log('[2FA Disable] Token expired, attempting refresh');
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
            console.log('[2FA Disable] Token refreshed successfully');
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
    
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      // Log security event for failed disable attempt
      await logSecurityEvent({
        userId: user.id,
        action: SecurityActions.TWO_FACTOR_DISABLED,
        ipAddress,
        userAgent,
        details: { reason: 'Invalid password' },
        success: false
      });
      
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    // Disable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorBackupCodes: null,
        twoFactorOtp: null,
        twoFactorOtpExpiry: null,
        twoFactorOtpAttempts: 0
      }
    });
    
    // Log security event (2FA disabled)
    await logSecurityEvent({
      userId: user.id,
      action: SecurityActions.TWO_FACTOR_DISABLED,
      ipAddress,
      userAgent,
      details: {},
      success: true
    });
    
    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: AuditActions['2FA_DISABLED'],
      resourceType: 'user',
      resourceId: user.id,
      details: {},
      ipAddress,
      userAgent
    });
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Two-Factor Authentication disabled successfully'
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
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}