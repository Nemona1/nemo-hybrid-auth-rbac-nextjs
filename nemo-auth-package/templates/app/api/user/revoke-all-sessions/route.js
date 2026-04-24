import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { createAuditLog, AuditActions } from '@/lib/audit';

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
    
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Get current session token
    const currentSessionToken = request.cookies.get('sessionToken')?.value;
    
    // Delete all sessions except current one
    const deletedSessions = await prisma.session.deleteMany({
      where: {
        userId: decoded.userId,
        sessionToken: { not: currentSessionToken }
      }
    });
    
    // Log security event for revoking all other sessions
    await logSecurityEvent({
      userId: decoded.userId,
      action: SecurityActions.ALL_OTHER_SESSIONS_REVOKED,
      ipAddress,
      userAgent,
      details: { revokedCount: deletedSessions.count },
      success: true
    });
    
    // Create audit log
    await createAuditLog({
      userId: decoded.userId,
      action: AuditActions.ALL_OTHER_SESSIONS_REVOKED,
      resourceType: 'session',
      resourceId: null,
      details: { revokedCount: deletedSessions.count },
      ipAddress,
      userAgent
    });
    
    // Also log to security log (keeping existing for compatibility)
    await prisma.securityLog.create({
      data: {
        userId: decoded.userId,
        action: 'ALL_OTHER_SESSIONS_REVOKED',
        details: { revokedCount: deletedSessions.count },
        ipAddress,
        userAgent,
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