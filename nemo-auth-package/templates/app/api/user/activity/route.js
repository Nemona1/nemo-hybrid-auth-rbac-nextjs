import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { createAuditLog, AuditActions } from '@/lib/audit';

export async function POST(request) {
  try {
    // Get token from Authorization header or cookie
    let token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      token = request.cookies.get('accessToken')?.value;
    }
    
    // Don't return error for activity tracking - just return success
    // This prevents console errors from inactivity timer
    if (!token) {
      return NextResponse.json({ success: true, note: 'No token provided' });
    }
    
    const { valid, decoded } = await verifyAccessToken(token);
    if (!valid) {
      return NextResponse.json({ success: true, note: 'Invalid token' });
    }
    
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Update user's last activity
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { lastActivityAt: new Date() }
    });
    
    // Update or create session
    const sessionToken = request.cookies.get('sessionToken')?.value || 
                         `session_${decoded.userId}_${Date.now()}`;
    
    await prisma.session.upsert({
      where: { sessionToken },
      update: {
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      },
      create: {
        userId: decoded.userId,
        sessionToken,
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        ipAddress,
        userAgent
      }
    });
    
    const response = NextResponse.json({ success: true });
    response.cookies.set('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60
    });
    
    return response;
    
  } catch (error) {
    console.error('Activity update error:', error);
    // Always return success to prevent client-side errors
    return NextResponse.json({ success: true });
  }
}

export async function GET(request) {
  try {
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
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { lastActivityAt: true, email: true }
    });
    
    const sessions = await prisma.session.findMany({
      where: {
        userId: decoded.userId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { lastActivity: 'desc' }
    });
    
    // Log security event for viewing sessions
    await logSecurityEvent({
      userId: decoded.userId,
      action: SecurityActions.SESSIONS_VIEWED,
      ipAddress,
      userAgent,
      details: { activeSessionCount: sessions.length },
      success: true
    });
    
    // Create audit log
    await createAuditLog({
      userId: decoded.userId,
      action: AuditActions.SESSIONS_VIEWED,
      resourceType: 'session',
      resourceId: null,
      details: { activeSessionCount: sessions.length },
      ipAddress,
      userAgent
    });
    
    return NextResponse.json({
      lastActivityAt: user?.lastActivityAt,
      activeSessions: sessions.length,
      sessions
    });
    
  } catch (error) {
    console.error('Activity fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}