import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { createAuditLog, AuditActions } from '@/lib/audit';

export async function POST(request) {
  try {
    // Try to get user info before logout for logging
    let token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      token = request.cookies.get('accessToken')?.value;
    }
    
    let userId = null;
    let userEmail = null;
    
    if (token) {
      const { valid, decoded } = await verifyAccessToken(token);
      if (valid && decoded) {
        userId = decoded.userId;
        userEmail = decoded.email;
      }
    }
    
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Log security event for logout
    if (userId) {
      await logSecurityEvent({
        userId,
        action: SecurityActions.LOGOUT,
        ipAddress,
        userAgent,
        details: { email: userEmail },
        success: true
      });
      
      await createAuditLog({
        userId,
        action: AuditActions.LOGOUT,
        resourceType: 'user',
        resourceId: userId,
        details: {},
        ipAddress,
        userAgent
      });
    }
    
    const response = NextResponse.json({ success: true });

    // Clear auth cookies (best-effort). Let browser scope handle domain.
    try {
      response.cookies.delete('accessToken');
      response.cookies.delete('refreshToken');
      response.cookies.delete('lastActivity');
      response.cookies.delete('sessionToken');
      response.cookies.delete('temp2faSession');
    } catch (e) {
      // ignore
    }

    return response;
    
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still clear cookies even if logging fails
    const response = NextResponse.json({ success: true });
    try {
      response.cookies.delete('accessToken');
      response.cookies.delete('refreshToken');
      response.cookies.delete('lastActivity');
      response.cookies.delete('sessionToken');
      response.cookies.delete('temp2faSession');
    } catch (e) {
      // ignore
    }
    
    return response;
  }
}