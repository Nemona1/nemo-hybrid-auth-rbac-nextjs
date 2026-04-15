import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { createAuditLog } from '@/lib/audit';
import { verifyStoredOtp, generateBackupCodes, hashBackupCodes } from '@/lib/auth/2fa';
import { sendBackupCodesEmail } from '@/lib/email/send2faOtp';

export async function POST(request) {
  try {
    const { otp } = await request.json();
    
    console.log('[2FA Enable] Received request with OTP:', otp);
    
    if (!otp) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }
    
    // Get token from Authorization header
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
    
    console.log('[2FA Enable] User ID:', decoded.userId);
    
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
    
    // Verify OTP
    console.log('[2FA Enable] Verifying OTP for user:', decoded.userId);
    const verification = await verifyStoredOtp(decoded.userId, otp);
    console.log('[2FA Enable] Verification result:', verification);
    
    if (!verification.valid) {
      return NextResponse.json({ error: verification.error }, { status: 400 });
    }
    
    // Generate backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = await hashBackupCodes(backupCodes);
    
    console.log('[2FA Enable] Backup codes generated:', backupCodes.length);
    
    // Enable 2FA and store backup codes
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: JSON.stringify(hashedBackupCodes)
      }
    });
    
    // Send backup codes email
    await sendBackupCodesEmail(user.email, backupCodes, user.firstName);
    
    await createAuditLog({
      userId: user.id,
      action: '2FA_ENABLED',
      resourceType: 'user',
      resourceId: user.id,
      details: { backupCodesGenerated: backupCodes.length },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
    
    console.log('[2FA Enable] 2FA enabled successfully for user:', user.email);
    
    return NextResponse.json({
      success: true,
      message: 'Two-Factor Authentication enabled successfully',
      backupCodes
    });
    
  } catch (error) {
    console.error('[2FA Enable] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}