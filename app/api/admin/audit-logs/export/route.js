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
    const type = searchParams.get('type') || 'all';
    const format = searchParams.get('format') || 'csv';
    
    // Log security event for audit export
    await logSecurityEvent({
      userId: decoded.userId,
      action: SecurityActions.AUDIT_EXPORT,
      ipAddress,
      userAgent,
      details: { type, format },
      success: true
    });
    
    // Create audit log for export action
    await createAuditLog({
      userId: decoded.userId,
      action: AuditActions.AUDIT_EXPORT,
      resourceType: 'audit',
      resourceId: null,
      details: { type, format },
      ipAddress,
      userAgent
    });
    
    // Fetch all logs without pagination for export
    let auditLogs = [];
    let securityLogs = [];
    
    if (type === 'all' || type === 'audit') {
      auditLogs = await prisma.auditLog.findMany({
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
        orderBy: { timestamp: 'desc' }
      });
    }
    
    if (type === 'all' || type === 'security') {
      securityLogs = await prisma.securityLog.findMany({
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
        orderBy: { createdAt: 'desc' }
      });
    }
    
    // Format data for CSV
    const formatCSV = (data, type) => {
      const headers = ['ID', 'User', 'Action', 'Details', 'IP Address', 'Timestamp', 'Success'];
      const rows = data.map(log => [
        log.id,
        log.user?.email || 'System',
        log.action,
        JSON.stringify(log.details || {}),
        log.ipAddress || 'Unknown',
        new Date(log.timestamp || log.createdAt).toISOString(),
        log.success !== undefined ? (log.success ? 'Yes' : 'No') : 'Yes'
      ]);
      return [headers, ...rows];
    };
    
    let csvData = [];
    let filename = '';
    
    if (type === 'audit') {
      csvData = formatCSV(auditLogs, 'audit');
      filename = `audit_logs_${new Date().toISOString()}.csv`;
    } else if (type === 'security') {
      csvData = formatCSV(securityLogs, 'security');
      filename = `security_logs_${new Date().toISOString()}.csv`;
    } else {
      // Combine both
      const combined = [
        ...auditLogs.map(l => ({ ...l, logType: 'AUDIT' })),
        ...securityLogs.map(l => ({ ...l, logType: 'SECURITY' }))
      ];
      csvData = [
        ['ID', 'User', 'Action', 'Details', 'IP Address', 'Timestamp', 'Success', 'Log Type'],
        ...combined.map(log => [
          log.id,
          log.user?.email || 'System',
          log.action,
          JSON.stringify(log.details || {}),
          log.ipAddress || 'Unknown',
          new Date(log.timestamp || log.createdAt).toISOString(),
          log.success !== undefined ? (log.success ? 'Yes' : 'No') : 'Yes',
          log.logType
        ])
      ];
      filename = `all_logs_${new Date().toISOString()}.csv`;
    }
    
    // Convert to CSV string
    const csvContent = csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
    
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}