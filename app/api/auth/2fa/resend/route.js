import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOtp, storeOtp } from '@/lib/auth/2fa';
import { send2faOtpEmail } from '@/lib/email/send2faOtp';

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
    
    // Generate new OTP
    const otp = generateOtp();
    await storeOtp(user.id, otp);
    
    // Send email
    const emailSent = await send2faOtpEmail(user.email, otp, user.firstName);
    
    if (!emailSent) {
      return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
    }
    
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