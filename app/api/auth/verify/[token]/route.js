import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { createAuditLog, AuditActions } from '@/lib/audit';

export async function GET(request, { params }) {
  try {
    const { token } = await params;
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    const baseUrl = process.env.NEXTAUTH_URL || 'https://shiny-garbanzo-5gpqjp5j95v5h7xjp-3000.app.github.dev';
    
    // Check for regular email verification (new registration)
    let userWithToken = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationExpiry: { gt: new Date() }
      }
    });
    
    if (userWithToken && !userWithToken.isVerified) {
      // Regular email verification for new registration
      await prisma.user.update({
        where: { id: userWithToken.id },
        data: {
          isVerified: true,
          verificationToken: null,
          verificationExpiry: null
        }
      });
      
      await logSecurityEvent({
        userId: userWithToken.id,
        action: SecurityActions.EMAIL_VERIFIED,
        ipAddress,
        userAgent,
        details: { email: userWithToken.email, type: 'registration' },
        success: true
      });
      
      await createAuditLog({
        userId: userWithToken.id,
        action: AuditActions.EMAIL_VERIFIED,
        resourceType: 'user',
        resourceId: userWithToken.id,
        details: { email: userWithToken.email },
        ipAddress,
        userAgent
      });
      
      return NextResponse.redirect(new URL('/verify/success', baseUrl));
    }
    
    // Check for pending email change verification
    let userWithPendingEmail = await prisma.user.findFirst({
      where: {
        pendingEmailToken: token,
        pendingEmailExpiry: { gt: new Date() }
      }
    });
    
    if (userWithPendingEmail && userWithPendingEmail.pendingEmail) {
      const oldEmail = userWithPendingEmail.email;
      const newEmail = userWithPendingEmail.pendingEmail;
      
      // Move pending email to primary email field
      await prisma.user.update({
        where: { id: userWithPendingEmail.id },
        data: {
          email: newEmail,
          pendingEmail: null,
          pendingEmailToken: null,
          pendingEmailExpiry: null,
          isVerified: true
        }
      });
      
      await logSecurityEvent({
        userId: userWithPendingEmail.id,
        action: SecurityActions.EMAIL_CHANGED,
        ipAddress,
        userAgent,
        details: { oldEmail, newEmail, type: 'email_change' },
        success: true
      });
      
      await createAuditLog({
        userId: userWithPendingEmail.id,
        action: 'EMAIL_CHANGE_COMPLETED',
        resourceType: 'user',
        resourceId: userWithPendingEmail.id,
        details: { oldEmail, newEmail },
        ipAddress,
        userAgent
      });
      
      // Invalidate all sessions to force re-login with new email
      await prisma.session.deleteMany({
        where: { userId: userWithPendingEmail.id }
      });
      
      return NextResponse.redirect(new URL('/verify/email-changed', baseUrl));
    }
    
    // Check if user is already verified (for regular verification)
    userWithToken = await prisma.user.findFirst({
      where: {
        verificationToken: token
      }
    });
    
    if (userWithToken && userWithToken.isVerified) {
      await logSecurityEvent({
        userId: userWithToken.id,
        action: SecurityActions.EMAIL_VERIFICATION_FAILED,
        ipAddress,
        userAgent,
        details: { reason: 'Already verified', email: userWithToken.email },
        success: false
      });
      
      return NextResponse.redirect(new URL('/verify/already-verified', baseUrl));
    }
    
    // No valid token found
    await logSecurityEvent({
      userId: null,
      action: SecurityActions.EMAIL_VERIFICATION_FAILED,
      ipAddress,
      userAgent,
      details: { reason: 'Invalid or expired token' },
      success: false
    });
    
    return NextResponse.redirect(new URL('/verify/error?reason=invalid_token', baseUrl));
    
  } catch (error) {
    console.error('[VERIFY] Error:', error);
    const baseUrl = process.env.NEXTAUTH_URL || 'https://shiny-garbanzo-5gpqjp5j95v5h7xjp-3000.app.github.dev';
    
    await logSecurityEvent({
      userId: null,
      action: SecurityActions.EMAIL_VERIFICATION_FAILED,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: { reason: 'Server error', error: error.message },
      success: false
    });
    
    return NextResponse.redirect(new URL('/verify/error?reason=server_error', baseUrl));
  }
}

export const dynamic = 'force-dynamic';