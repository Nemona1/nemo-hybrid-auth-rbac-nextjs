import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';

export async function POST(request) {
  try {
    // Get token from Authorization header
    let token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      token = request.cookies.get('accessToken')?.value;
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid, decoded } = await verifyAccessToken(token);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Get current session token
    const currentSessionToken = request.cookies.get('sessionToken')?.value;
    
    // Delete all sessions except current one
    const deletedSessions = await prisma.session.deleteMany({
      where: {
        userId: decoded.userId,
        sessionToken: { not: currentSessionToken }
      }
    });
    
    // Log the action
    await prisma.securityLog.create({
      data: {
        userId: decoded.userId,
        action: 'ALL_OTHER_SESSIONS_REVOKED',
        details: { revokedCount: deletedSessions.count },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        success: true
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully revoked ${deletedSessions.count} other session(s)`,
      revokedCount: deletedSessions.count
    });
    
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}