import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { createAuditLog, AuditActions } from '@/lib/audit';

export async function GET(request, { params }) {
  try {
    const { token } = await params;
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    console.log('[VERIFY] ========================================');
    console.log('[VERIFY] Token received:', token);
    
    // Force the correct base URL
    const baseUrl = 'https://shiny-garbanzo-5gpqjp5j95v5h7xjp-3000.app.github.dev';
    
    console.log('[VERIFY] Using base URL:', baseUrl);
    
    const userWithToken = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationExpiry: { gt: new Date() }
      }
    });
    
    console.log('[VERIFY] User found:', userWithToken?.email || 'No user found');
    
    if (!userWithToken) {
      console.log('[VERIFY] No user found, redirecting to error page');
      
      // Log security event for invalid verification attempt
      await logSecurityEvent({
        userId: null,
        action: SecurityActions.EMAIL_VERIFICATION_FAILED,
        ipAddress,
        userAgent,
        details: { reason: 'Invalid or expired token' },
        success: false
      });
      
      return NextResponse.redirect(new URL('/verify/error?reason=invalid_token', baseUrl));
    }
    
    if (userWithToken.isVerified) {
      console.log('[VERIFY] User already verified');
      
      // Log security event for already verified attempt
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
    
    // Update user as verified
    await prisma.user.update({
      where: { id: userWithToken.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationExpiry: null
      }
    });
    
    console.log('[VERIFY] User verified successfully:', userWithToken.email);
    
    // Log security event for successful verification
    await logSecurityEvent({
      userId: userWithToken.id,
      action: SecurityActions.EMAIL_VERIFIED,
      ipAddress,
      userAgent,
      details: { email: userWithToken.email },
      success: true
    });
    
    // Create audit log
    await createAuditLog({
      userId: userWithToken.id,
      action: AuditActions.EMAIL_VERIFIED,
      resourceType: 'user',
      resourceId: userWithToken.id,
      details: { email: userWithToken.email },
      ipAddress,
      userAgent
    });
    
    // Redirect to success page (NOT directly to login)
    const successUrl = new URL('/verify/success', baseUrl);
    console.log('[VERIFY] Redirecting to success page:', successUrl.toString());
    
    return NextResponse.redirect(successUrl);
    
  } catch (error) {
    console.error('[VERIFY] Error:', error);
    const baseUrl = 'https://shiny-garbanzo-5gpqjp5j95v5h7xjp-3000.app.github.dev';
    
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