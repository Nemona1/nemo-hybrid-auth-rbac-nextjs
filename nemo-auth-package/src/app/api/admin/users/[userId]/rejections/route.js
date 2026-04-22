import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/auth/permissions';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { createAuditLog, AuditActions } from '@/lib/audit';

export async function GET(request, { params }) {
  try {
    const { userId } = await params;
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    const accessToken = request.cookies.get('accessToken')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid, decoded } = await verifyAccessToken(accessToken);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const hasAdminAccess = await hasPermission(decoded.userId, 'users:read');
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get target user info for security log
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true }
    });
    
    // Log security event for viewing rejection history
    await logSecurityEvent({
      userId: decoded.userId,
      action: SecurityActions.REJECTION_HISTORY_VIEWED,
      ipAddress,
      userAgent,
      details: {
        targetUserId: userId,
        targetUserEmail: targetUser?.email
      },
      success: true
    });
    
    // Create audit log
    await createAuditLog({
      userId: decoded.userId,
      action: AuditActions.REJECTION_HISTORY_VIEWED,
      resourceType: 'user',
      resourceId: userId,
      details: { targetUserEmail: targetUser?.email },
      ipAddress,
      userAgent
    });
    
    const rejections = await prisma.roleApplicationRejection.findMany({
      where: { userId },
      include: {
        requestedRole: true
      },
      orderBy: { rejectedAt: 'desc' }
    });
    
    return NextResponse.json(rejections);
    
  } catch (error) {
    console.error('Fetch rejections error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}