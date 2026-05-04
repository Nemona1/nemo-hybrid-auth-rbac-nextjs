import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken, verifyPassword } from '@/lib/auth';
import { generateOtp, storeOtp } from '@/lib/auth/2fa';
import { sendEmailChangeOtp } from '@/lib/email/sendEmailChangeOtp';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { createAuditLog } from '@/lib/audit';

export async function POST(request) {
  try {
    const { newEmail, currentPassword } = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Validate input
    if (!newEmail || !currentPassword) {
      return NextResponse.json({ 
        error: 'New email and current password are required' 
      }, { status: 400 });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
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
    
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if new email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email: newEmail,
        id: { not: decoded.userId }
      }
    });
    
    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
    
    // Check if new email is same as current email
    if (newEmail === currentUser.email) {
      return NextResponse.json({ error: 'New email is the same as current email' }, { status: 400 });
    }
    
    // Verify current password
    const isPasswordValid = await verifyPassword(currentPassword, currentUser.passwordHash);
    if (!isPasswordValid) {
      await logSecurityEvent({
        userId: decoded.userId,
        action: SecurityActions.EMAIL_CHANGE_REQUESTED,
        ipAddress,
        userAgent,
        details: { reason: 'Invalid password' },
        success: false
      });
      
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }
    
    // Generate and store OTP
    const otp = generateOtp();
    await storeOtp(currentUser.id, otp);
    
    // Send OTP to current email
    const emailSent = await sendEmailChangeOtp(currentUser.email, otp, currentUser.firstName);
    
    if (!emailSent) {
      return NextResponse.json({ 
        error: 'Failed to send verification code. Please try again.' 
      }, { status: 500 });
    }
    
    // Store pending email change request in session or temporary storage
    const changeRequestToken = Buffer.from(JSON.stringify({
      userId: currentUser.id,
      newEmail,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    })).toString('base64');
    
    await logSecurityEvent({
      userId: currentUser.id,
      action: SecurityActions.EMAIL_CHANGE_REQUESTED,
      ipAddress,
      userAgent,
      details: { oldEmail: currentUser.email, newEmail },
      success: true
    });
    
    const response = NextResponse.json({
      success: true,
      requiresOtpVerification: true,
      message: 'A verification code has been sent to your current email address. Please enter it to proceed.'
    });
    
    response.cookies.set('emailChangeRequest', changeRequestToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60
    });
    
    return response;
    
  } catch (error) {
    console.error('Request email change error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}