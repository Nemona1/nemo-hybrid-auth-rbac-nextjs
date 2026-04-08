import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.NEXTAUTH_URL,
        grant_type: 'authorization_code',
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error('Google token error:', tokenData);
      return NextResponse.json({ error: 'Failed to get access token' }, { status: 400 });
    }
    
    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    
    const googleUser = await userResponse.json();
    
    if (!googleUser.email) {
      return NextResponse.json({ error: 'Failed to get user info' }, { status: 400 });
    }
    
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });
    
    if (!user) {
      // Create new user
      const nameParts = googleUser.name?.split(' ') || ['Google', 'User'];
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          firstName: nameParts[0] || 'Google',
          lastName: nameParts.slice(1).join(' ') || 'User',
          passwordHash: 'google-oauth-no-password',
          isVerified: true,
          applicationStatus: 'PENDING',
        },
      });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Return tokens as JSON (not redirect)
    return NextResponse.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        applicationStatus: user.applicationStatus
      }
    });
    
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}