import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    // Try to get token from Authorization header first (localStorage)
    const authHeader = request.headers.get('Authorization');
    let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    // Fallback to cookie
    if (!token) {
      token = request.cookies.get('accessToken')?.value;
    }
    
    console.log('[server] GET /api/auth/me - Token exists:', !!token);
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid, decoded } = await verifyAccessToken(token);
    
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Return all user data including twoFactorEnabled
    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      applicationStatus: user.applicationStatus,
      twoFactorEnabled: user.twoFactorEnabled,  // ← ADD THIS LINE
      isVerified: user.isVerified               // ← Also add this for completeness
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}