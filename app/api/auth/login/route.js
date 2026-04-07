import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, handleFailedLogin, resetFailedAttempts, logSecurityEvent } from '@/lib/auth/security';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    console.log('[LOGIN] Attempting login for:', email);
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }
    
    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      console.log('[LOGIN] User not found:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Check lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingSeconds = Math.ceil((user.lockoutUntil - new Date()) / 1000);
      console.log('[LOGIN] Account locked:', remainingSeconds);
      return NextResponse.json(
        { error: `Account locked. Try again in ${remainingSeconds} seconds`, locked: true, lockoutTime: remainingSeconds },
        { status: 429 }
      );
    }
    
    // Check email verification
    if (!user.isVerified) {
      console.log('[LOGIN] Email not verified:', email);
      return NextResponse.json(
        { error: 'Please verify your email before logging in' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    
    if (!isValid) {
      console.log('[LOGIN] Invalid password for:', email);
      const result = await handleFailedLogin(email, request.headers.get('x-forwarded-for'), request.headers.get('user-agent'));
      
      if (result.locked) {
        return NextResponse.json(
          { error: `Too many failed attempts. Account locked for ${result.lockoutTime} seconds`, locked: true, lockoutTime: result.lockoutTime },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: 'Invalid credentials', remainingAttempts: result.remainingAttempts },
        { status: 401 }
      );
    }
    
    // Reset failed attempts
    await resetFailedAttempts(email);
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    console.log('[LOGIN] Successful for:', email);
    
    // Create response with JSON body
    const response = NextResponse.json({
      success: true,
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: user.roleId,
        applicationStatus: user.applicationStatus
      }
    });
    
    // Set cookies for middleware authentication
    const isProduction = process.env.NODE_ENV === 'production';
    
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60
    });
    
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    });
    
    response.cookies.set('lastActivity', Date.now().toString(), {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60
    });
    
    return response;
    
  } catch (error) {
    console.error('[LOGIN] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}