import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { generateOtp, storeOtp } from '@/lib/auth/2fa';
import { sendEmailChangeOtp } from '@/lib/email/sendEmailChangeOtp';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';

export async function POST(request) {
  try {
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
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
    
    // Get email change request from cookie
    const changeRequestCookie = request.cookies.get('emailChangeRequest')?.value;
    if (!changeRequestCookie) {
      return NextResponse.json({ 
        error: 'No pending email change request. Please start over.' 
      }, { status: 400 });
    }
    
    let changeRequest;
    try {
      changeRequest = JSON.parse(Buffer.from(changeRequestCookie, 'base64').toString());
      if (changeRequest.expiresAt < Date.now()) {
        return NextResponse.json({ error: 'Request expired. Please start over.' }, { status: 400 });
      }
      if (changeRequest.userId !== decoded.userId) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Generate new OTP
    const otp = generateOtp();
    await storeOtp(currentUser.id, otp);
    
    // Send new OTP to current email
    const emailSent = await sendEmailChangeOtp(currentUser.email, otp, currentUser.firstName);
    
    if (!emailSent) {
      return NextResponse.json({ 
        error: 'Failed to send verification code. Please try again.' 
      }, { status: 500 });
    }
    
    await logSecurityEvent({
      userId: currentUser.id,
      action: SecurityActions.EMAIL_CHANGE_OTP_RESENT,
      ipAddress,
      userAgent,
      details: { email: currentUser.email },
      success: true
    });
    
    return NextResponse.json({
      success: true,
      message: 'New verification code sent to your email'
    });
    
  } catch (error) {
    console.error('Resend email change OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}