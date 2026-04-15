import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { createAuditLog } from '@/lib/audit';
import { generateOtp, storeOtp } from '@/lib/auth/2fa';
import { send2faOtpEmail } from '@/lib/email/send2faOtp';

export async function POST(request) {
  try {
    // No need to parse JSON body for setup
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
    
    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 });
    }
    
    // Generate OTP
    const otp = generateOtp();
    storeOtp(user.id, otp);
    
    // Send OTP email
    const emailSent = await send2faOtpEmail(user.email, otp, user.firstName);
    
    if (!emailSent) {
      return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
    }
    
    await createAuditLog({
      userId: user.id,
      action: '2FA_SETUP_INITIATED',
      resourceType: 'user',
      resourceId: user.id,
      details: { email: user.email },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
    
    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email'
    });
    
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}