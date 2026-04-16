import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { createAuditLog, AuditActions } from '@/lib/audit';

export async function POST(request) {
  try {
    const { sessionToken } = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token required' }, { status: 400 });
    }
    
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
    
    // Verify the session belongs to the user
    const session = await prisma.session.findFirst({
      where: {
        sessionToken,
        userId: decoded.userId
      }
    });
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Check if trying to revoke current session
    const currentSessionToken = request.cookies.get('sessionToken')?.value;
    const isCurrentSession = sessionToken === currentSessionToken;
    
    // Delete the session
    await prisma.session.delete({
      where: { sessionToken }
    });
    
    // Log security event for session revocation
    await logSecurityEvent({
      userId: decoded.userId,
      action: SecurityActions.SESSION_REVOKED,
      ipAddress,
      userAgent,
      details: { 
        sessionToken, 
        deviceInfo: session.userAgent,
        wasCurrentSession: isCurrentSession
      },
      success: true
    });
    
    // Create audit log
    await createAuditLog({
      userId: decoded.userId,
      action: AuditActions.SESSION_REVOKED,
      resourceType: 'session',
      resourceId: sessionToken,
      details: { 
        deviceInfo: session.userAgent,
        wasCurrentSession: isCurrentSession
      },
      ipAddress,
      userAgent
    });
    
    // Also log to security log (keeping existing for compatibility)
    await prisma.securityLog.create({
      data: {
        userId: decoded.userId,
        action: 'SESSION_REVOKED',
        details: { 
          sessionToken, 
          deviceInfo: session.userAgent,
          wasCurrentSession: isCurrentSession
        },
        ipAddress,
        userAgent,
        success: true
      }
    });
    
    // If revoking current session, also clear cookies in response
    const response = NextResponse.json({ 
      success: true, 
      message: isCurrentSession ? 'Current session revoked. You will be logged out.' : 'Session revoked successfully'
    });
    
    if (isCurrentSession) {
      response.cookies.delete('accessToken');
      response.cookies.delete('refreshToken');
      response.cookies.delete('sessionToken');
      response.cookies.delete('lastActivity');
    }
    
    return response;
    
  } catch (error) {
    console.error('Revoke session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}