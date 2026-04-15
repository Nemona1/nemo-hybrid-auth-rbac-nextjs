import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/auth/permissions';

export async function GET(request) {
  try {
    console.log('[AUDIT LOGS API] ========== START ==========');
    
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
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const resourceType = searchParams.get('resourceType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build where conditions
    let where = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (action) {
      where.action = action;
    }
    
    if (resourceType) {
      where.resourceType = resourceType;
    }
    
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.timestamp = { gte: start };
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.timestamp = { ...where.timestamp, lte: end };
    }
    
    // Fetch audit logs
    const logs = await prisma.auditLog.findMany({
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
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset
    });
    
    const total = await prisma.auditLog.count({ where });
    
    // Get unique actions for filter
    const uniqueActions = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: true
    });
    
    // Get unique resource types
    const uniqueResourceTypes = await prisma.auditLog.groupBy({
      by: ['resourceType'],
      _count: true
    });
    
    // Get users for filter
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      },
      orderBy: { email: 'asc' }
    });
    
    console.log('[AUDIT LOGS API] Found logs:', logs.length);
    console.log('[AUDIT LOGS API] Total:', total);
    console.log('[AUDIT LOGS API] ========== END ==========');
    
    return NextResponse.json({
      success: true,
      data: {
        logs,
        total,
        filters: {
          actions: uniqueActions,
          resourceTypes: uniqueResourceTypes,
          users
        }
      }
    });
    
  } catch (error) {
    console.error('[AUDIT LOGS API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}