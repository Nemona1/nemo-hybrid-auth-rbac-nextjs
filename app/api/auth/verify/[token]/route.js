import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { token } = await params;
    
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
      return NextResponse.redirect(new URL('/verify/error?reason=invalid_token', baseUrl));
    }
    
    if (userWithToken.isVerified) {
      console.log('[VERIFY] User already verified');
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
    
    // Redirect to success page (NOT directly to login)
    const successUrl = new URL('/verify/success', baseUrl);
    console.log('[VERIFY] Redirecting to success page:', successUrl.toString());
    
    return NextResponse.redirect(successUrl);
    
  } catch (error) {
    console.error('[VERIFY] Error:', error);
    const baseUrl = 'https://shiny-garbanzo-5gpqjp5j95v5h7xjp-3000.app.github.dev';
    return NextResponse.redirect(new URL('/verify/error?reason=server_error', baseUrl));
  }
}

export const dynamic = 'force-dynamic';