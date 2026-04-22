import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email/sendVerificationEmail';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { createAuditLog, AuditActions } from '@/lib/audit';
import crypto from 'crypto';

export async function POST(request) {
  try {
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
    
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        verificationToken,
        verificationExpiry
      }
    });
    
    // Send verification email
    const emailSent = await sendVerificationEmail(user.email, verificationToken, user.firstName);
    
    if (!emailSent) {
      // Log security event for failed resend
      await logSecurityEvent({
        userId: user.id,
        action: SecurityActions.EMAIL_VERIFICATION_RESEND,
        ipAddress,
        userAgent,
        details: { email: user.email, reason: 'Email send failed' },
        success: false,
        req: request
      });
      
      return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
    }
    
    // Log security event for successful resend
    await logSecurityEvent({
      userId: user.id,
      action: SecurityActions.EMAIL_VERIFICATION_RESEND,
      ipAddress,
      userAgent,
      details: { email: user.email },
      success: true,
      req: request
    });
    
    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: AuditActions.EMAIL_VERIFICATION_RESENT,
      resourceType: 'user',
      resourceId: user.id,
      details: { email: user.email },
      ipAddress,
      userAgent
    });
    
    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully'
    });
    
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}