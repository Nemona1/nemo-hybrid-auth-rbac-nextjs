import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken, rotateRefreshToken } from '@/lib/auth/jwt';
import { createAuditLog, AuditActions } from '@/lib/audit';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { verifyStoredOtp, generateBackupCodes, hashBackupCodes } from '@/lib/auth/2fa';
import { sendBackupCodesEmail } from '@/lib/email/send2faOtp';

export async function POST(request) {
  try {
    const { otp } = await request.json();
    
    if (!otp) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
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
      console.log('[2FA Enable] Token expired, attempting refresh');
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
            console.log('[2FA Enable] Token refreshed successfully');
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
    
    // Verify OTP
    const verification = await verifyStoredOtp(user.id, otp);
    if (!verification.valid) {
      // Log security event for failed OTP verification
      await logSecurityEvent({
        userId: user.id,
        action: SecurityActions.TWO_FACTOR_VERIFICATION_FAILED,
        ipAddress,
        userAgent,
        details: { reason: verification.error, method: 'OTP' },
        success: false
      });
      
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }
    
    // Generate backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = await hashBackupCodes(backupCodes);
    
    // Enable 2FA and store backup codes
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: JSON.stringify(hashedBackupCodes)
      }
    });
    
    // Send backup codes email
    await sendBackupCodesEmail(user.email, backupCodes, user.firstName);
    
    // Log security event (2FA enabled successfully)
    await logSecurityEvent({
      userId: user.id,
      action: SecurityActions.TWO_FACTOR_ENABLED,
      ipAddress,
      userAgent,
      details: { backupCodesGenerated: backupCodes.length },
      success: true
    });
    
    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: AuditActions['2FA_ENABLED'],
      resourceType: 'user',
      resourceId: user.id,
      details: { method: 'EMAIL_OTP', backupCodesGenerated: backupCodes.length },
      ipAddress,
      userAgent
    });
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Two-Factor Authentication enabled successfully',
      backupCodes
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
    console.error('2FA enable error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}