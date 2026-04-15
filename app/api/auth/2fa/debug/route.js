import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { getOtpStoreDebug } from '@/lib/auth/2fa';

export async function GET(request) {
  try {
    let token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      token = request.cookies.get('accessToken')?.value;
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid } = await verifyAccessToken(token);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const otpStore = getOtpStoreDebug();
    
    return NextResponse.json({
      success: true,
      otpStore,
      storeSize: Object.keys(otpStore).length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}