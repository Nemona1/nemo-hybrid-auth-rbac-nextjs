import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStoredOtp, verifyBackupCode, generateDeviceFingerprint, getDeviceType, getDeviceName } from '@/lib/auth/2fa';
import { createAuditLog } from '@/lib/audit';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';

export async function POST(request) {
  try {
    const { otp, backupCode, rememberDevice } = await request.json();
    
    console.log('[2FA Verify] Received request:', { otp: otp?.substring(0, 2) + '***', hasBackupCode: !!backupCode });
    
    if (!otp && !backupCode) {
      return NextResponse.json({ error: 'Verification code or backup code is required' }, { status: 400 });
    }
    
    // Get temporary session from cookie
    const tempSession = request.cookies.get('temp2faSession')?.value;
    console.log('[2FA Verify] Temp session exists:', !!tempSession);
    
    if (!tempSession) {
      return NextResponse.json({ error: 'Session expired. Please login again.' }, { status: 401 });
    }
    
    // Parse temp session to get user ID
    let userId;
    try {
      const sessionData = JSON.parse(Buffer.from(tempSession, 'base64').toString());
      userId = sessionData.userId;
      console.log('[2FA Verify] User ID from session:', userId);
      
      if (sessionData.expiresAt < Date.now()) {
        console.log('[2FA Verify] Session expired');
        return NextResponse.json({ error: 'Session expired. Please login again.' }, { status: 401 });
      }
    } catch (error) {
      console.error('[2FA Verify] Session parse error:', error);
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    // Get user with role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });
    
    if (!user) {
      console.log('[2FA Verify] User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('[2FA Verify] User found:', user.email);
    
    let isValid = false;
    let verificationMethod = '';
    
    // Verify OTP
    if (otp) {
      console.log('[2FA Verify] Verifying OTP...');
      const verification = await verifyStoredOtp(user.id, otp);
      console.log('[2FA Verify] OTP verification result:', verification);
      
      if (verification.valid) {
        isValid = true;
        verificationMethod = 'OTP';
      } else {
        return NextResponse.json({ error: verification.error }, { status: 401 });
      }
    }
    
    // If OTP fails, try backup code
    if (!isValid && backupCode && user.twoFactorBackupCodes) {
      const storedCodes = JSON.parse(user.twoFactorBackupCodes);
      const matchedCode = await verifyBackupCode(backupCode, storedCodes);
      
      if (matchedCode) {
        isValid = true;
        verificationMethod = 'BACKUP_CODE';
        
        // Remove used backup code
        const remainingCodes = storedCodes.filter(c => c.code !== matchedCode);
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorBackupCodes: JSON.stringify(remainingCodes) }
        });
      }
    }
    
    if (!isValid) {
      await createAuditLog({
        userId: user.id,
        action: '2FA_VERIFICATION_FAILED',
        resourceType: 'user',
        resourceId: user.id,
        details: { method: otp ? 'OTP' : 'BACKUP_CODE' },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });
      
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 });
    }
    
    // Handle trusted device
    if (rememberDevice) {
      const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const deviceId = generateDeviceFingerprint(userAgent, ipAddress);
      const deviceType = getDeviceType(userAgent);
      const deviceName = getDeviceName(userAgent);
      
      await prisma.trustedDevice.upsert({
        where: {
          userId_deviceId: {
            userId: user.id,
            deviceId
          }
        },
        update: {
          lastUsedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        create: {
          userId: user.id,
          deviceId,
          deviceName,
          deviceType,
          ipAddress,
          userAgent,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
    }
    
    // Determine redirect URL based on role
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
    
    // Generate tokens
    console.log('[2FA Verify] Generating tokens for user:', user.id);
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    console.log('[2FA Verify] Tokens generated successfully');
    
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
        applicationStatus: user.applicationStatus
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
    
    // Clear the temporary 2FA session cookie
    response.cookies.delete('temp2faSession');
    
    await createAuditLog({
      userId: user.id,
      action: '2FA_VERIFICATION_SUCCESS',
      resourceType: 'user',
      resourceId: user.id,
      details: { method: verificationMethod, rememberDevice },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
    
    console.log('[2FA Verify] Verification successful, sending response');
    
    return response;
    
  } catch (error) {
    console.error('[2FA Verify] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}