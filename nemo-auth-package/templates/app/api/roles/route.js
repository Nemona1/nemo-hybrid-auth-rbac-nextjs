import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';

export async function GET(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('[PUBLIC ROLES] Token from Authorization header');
    }
    
    // Also check cookie as fallback
    if (!token) {
      token = request.cookies.get('accessToken')?.value;
      if (token) console.log('[PUBLIC ROLES] Token from cookie');
    }
    
    if (!token) {
      console.log('[PUBLIC ROLES] No token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify token
    const { valid, decoded, error } = await verifyAccessToken(token);
    
    if (!valid) {
      console.log('[PUBLIC ROLES] Invalid token:', error);
      return NextResponse.json({ error: 'Invalid token: ' + error }, { status: 401 });
    }
    
    console.log('[PUBLIC ROLES] User ID:', decoded.userId);
    
    // Fetch all non-ADMIN roles for users to request
    const roles = await prisma.role.findMany({
      where: {
        name: { not: 'ADMIN' }
      },
      select: {
        id: true,
        name: true,
        description: true
      },
      orderBy: { name: 'asc' }
    });
    
    console.log('[PUBLIC ROLES] Found roles:', roles.length);
    
    return NextResponse.json({ roles });
    
  } catch (error) {
    console.error('[PUBLIC ROLES] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}