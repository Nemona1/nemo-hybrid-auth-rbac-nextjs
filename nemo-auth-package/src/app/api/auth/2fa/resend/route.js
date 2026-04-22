import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOtp, storeOtp } from '@/lib/auth/2fa';
import { send2faOtpEmail } from '@/lib/email/send2faOtp';
import { createAuditLog, AuditActions } from '@/lib/audit';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';

export async function POST(request) {
  try {
    const tempSession = request.cookies.get('temp2faSession')?.value;
    
    if (!tempSession) {
      return NextResponse.json({ error: 'Session expired. Please login again.' }, { status: 401 });
    }
    
    let userId;
    try {
      const sessionData = JSON.parse(Buffer.from(tempSession, 'base64').toString());
      userId = sessionData.userId;
      if (sessionData.expiresAt < Date.now()) {
        return NextResponse.json({ error: 'Session expired. Please login again.' }, { status: 401 });
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Generate new OTP
    const otp = generateOtp();
    await storeOtp(user.id, otp);
    
    // Send email
    const emailSent = await send2faOtpEmail(user.email, otp, user.firstName);
    
    if (!emailSent) {
      // Log security event for failed OTP resend
      await logSecurityEvent({
        userId: user.id,
        action: SecurityActions.TWO_FACTOR_RESEND_CODE,
        ipAddress,
        userAgent,
        details: { reason: 'Email send failed' },
        success: false
      });
      
      return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
    }
    
    // Log security event for OTP resend
    await logSecurityEvent({
      userId: user.id,
      action: SecurityActions.TWO_FACTOR_RESEND_CODE,
      ipAddress,
      userAgent,
      details: { 
        emailSent: true,
        timestamp: new Date().toISOString()
      },
      success: true
    });
    
    // Create audit log for resend attempt
    await createAuditLog({
      userId: user.id,
      action: AuditActions['2FA_SETUP_INITIATED'], // Reusing setup initiated action for tracking
      resourceType: 'user',
      resourceId: user.id,
      details: { action: 'RESEND_CODE', emailSent: true },
      ipAddress,
      userAgent
    });
    
    return NextResponse.json({
      success: true,
      message: 'New verification code sent'
    });
    
  } catch (error) {
    console.error('Resend 2FA code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}