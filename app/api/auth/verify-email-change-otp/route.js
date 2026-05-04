import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { verifyStoredOtp } from '@/lib/auth/2fa';
import { sendVerificationEmail } from '@/lib/email/sendVerificationEmail';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { createAuditLog } from '@/lib/audit';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { otp } = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    if (!otp) {
      return NextResponse.json({ error: 'OTP is required' }, { status: 400 });
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
    
    // Verify OTP
    const isValidOtp = await verifyStoredOtp(decoded.userId, otp);
    
    if (!isValidOtp) {
      await logSecurityEvent({
        userId: decoded.userId,
        action: SecurityActions.EMAIL_CHANGE_OTP_FAILED,
        ipAddress,
        userAgent,
        details: { reason: 'Invalid OTP' },
        success: false
      });
      
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 });
    }
    
    // Generate verification token for new email
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store pending email
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        pendingEmail: changeRequest.newEmail,
        pendingEmailToken: verificationToken,
        pendingEmailExpiry: verificationExpiry
      }
    });
    
    // Send verification link to NEW email
    const emailSent = await sendVerificationEmail(
      changeRequest.newEmail, 
      verificationToken, 
      decoded.userId,
      'email-change'
    );
    
    if (!emailSent) {
      // Clear pending email if sending fails
      await prisma.user.update({
        where: { id: decoded.userId },
        data: {
          pendingEmail: null,
          pendingEmailToken: null,
          pendingEmailExpiry: null
        }
      });
      
      return NextResponse.json({ 
        error: 'Failed to send verification email. Please try again.' 
      }, { status: 500 });
    }
    
    await logSecurityEvent({
      userId: decoded.userId,
      action: SecurityActions.EMAIL_CHANGE_OTP_VERIFIED,
      ipAddress,
      userAgent,
      details: { newEmail: changeRequest.newEmail },
      success: true
    });
    
    await createAuditLog({
      userId: decoded.userId,
      action: 'EMAIL_CHANGE_OTP_VERIFIED',
      resourceType: 'user',
      resourceId: decoded.userId,
      details: { newEmail: changeRequest.newEmail },
      ipAddress,
      userAgent
    });
    
    // Clear the cookie
    const response = NextResponse.json({
      success: true,
      message: 'Verification code verified. A confirmation link has been sent to your new email address.'
    });
    
    response.cookies.set('emailChangeRequest', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0
    });
    
    return response;
    
  } catch (error) {
    console.error('Verify email change OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}