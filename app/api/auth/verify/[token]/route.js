import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logSecurityEvent } from '@/lib/auth/security';

export async function GET(request, { params }) {
  try {
    const { token } = params;
    
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationExpiry: { gt: new Date() }
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }
    
    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationExpiry: null
      }
    });
    
    await logSecurityEvent({
      userId: user.id,
      action: 'EMAIL_VERIFIED',
      details: { email: user.email },
      success: true,
      req: request
    });
    
    // Redirect to login page with success message
    return NextResponse.redirect(
      new URL('/login?verified=true', request.url)
    );
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}