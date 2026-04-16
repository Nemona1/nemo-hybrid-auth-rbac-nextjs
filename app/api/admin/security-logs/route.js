import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/auth/permissions';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { createAuditLog, AuditActions } from '@/lib/audit';

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
    
    const hasAdminAccess = await hasPermission(decoded.userId, 'audit:read');
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Log security event for security log access
    await logSecurityEvent({
      userId: decoded.userId,
      action: SecurityActions.SECURITY_LOG_ACCESS,
      ipAddress,
      userAgent,
      details: { 
        filters: { action, userId },
        limit,
        offset
      },
      success: true
    });
    
    // Create audit log for accessing security logs
    await createAuditLog({
      userId: decoded.userId,
      action: AuditActions.SECURITY_LOG_ACCESS,
      resourceType: 'security',
      resourceId: null,
      details: { filters: { action, userId } },
      ipAddress,
      userAgent
    });
    
    let where = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    
    // Fetch security logs WITH user relation
    const logs = await prisma.securityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
    
    const total = await prisma.securityLog.count({ where });
    
    // Parse JSON details
    const logsWithParsedDetails = logs.map(log => ({
      ...log,
      details: typeof log.details === 'string' ? JSON.parse(log.details || '{}') : log.details
    }));
    
    // Get unique actions for filter
    const uniqueActions = await prisma.securityLog.groupBy({
      by: ['action'],
      _count: true
    });
    
    // Get all users for filter
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      },
      orderBy: { email: 'asc' }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        logs: logsWithParsedDetails,
        total,
        filters: {
          actions: uniqueActions,
          users
        }
      }
    });
    
  } catch (error) {
    console.error('[SECURITY LOGS API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}