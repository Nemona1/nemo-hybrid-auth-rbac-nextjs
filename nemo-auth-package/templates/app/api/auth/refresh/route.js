import { NextResponse } from 'next/server';
import { rotateRefreshToken } from '@/lib/auth/jwt';

export async function POST(request) {
  try {
    // Try to get refresh token from Authorization header
    const authHeader = request.headers.get('Authorization');
    let refreshToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    // Fallback to cookie
    if (!refreshToken) {
      refreshToken = request.cookies.get('refreshToken')?.value;
    }
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      );
    }
    
    const result = await rotateRefreshToken(refreshToken);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}