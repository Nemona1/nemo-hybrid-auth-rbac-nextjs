import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/auth/permissions';
import { createAuditLog } from '@/lib/audit';

export async function GET(request) {
  try {
    // Get token from Authorization header or cookie
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
    
    const hasAccess = await hasPermission(decoded.userId, 'permissions:direct');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const permissions = await prisma.permission.findMany({
      orderBy: { category: 'asc' }
    });
    
    return NextResponse.json(permissions);
    
  } catch (error) {
    console.error('[PERMISSIONS API] Fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { userId, permissionId, isGranted = true, expiresAt } = await request.json();
    
    if (!userId || !permissionId) {
      return NextResponse.json(
        { error: 'User ID and Permission ID are required' },
        { status: 400 }
      );
    }
    
    // Get token from Authorization header or cookie
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
    
    const hasAccess = await hasPermission(decoded.userId, 'permissions:direct');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Get admin user info for audit log
    const adminUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { email: true, firstName: true, lastName: true }
    });
    
    const userPermission = await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId,
          permissionId
        }
      },
      update: {
        isGranted,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        grantedBy: decoded.userId
      },
      create: {
        userId,
        permissionId,
        isGranted,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        grantedBy: decoded.userId
      }
    });
    
    // Create audit log
    await createAuditLog({
      userId: decoded.userId,
      action: isGranted ? 'PERMISSION_GRANTED' : 'PERMISSION_REVOKED',
      resourceType: 'permission',
      resourceId: permissionId,
      details: {
        targetUserId: userId,
        permissionId,
        isGranted,
        expiresAt,
        adminEmail: adminUser?.email
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
    
    return NextResponse.json({
      success: true,
      message: `Permission ${isGranted ? 'granted' : 'revoked'} successfully`,
      data: userPermission
    });
    
  } catch (error) {
    console.error('[PERMISSIONS API] Grant/Revoke error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const permissionId = searchParams.get('permissionId');
    
    if (!userId || !permissionId) {
      return NextResponse.json(
        { error: 'User ID and Permission ID are required' },
        { status: 400 }
      );
    }
    
    // Get token from Authorization header or cookie
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
    
    const hasAccess = await hasPermission(decoded.userId, 'permissions:direct');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    await prisma.userPermission.delete({
      where: {
        userId_permissionId: {
          userId,
          permissionId
        }
      }
    });
    
    // Create audit log
    await createAuditLog({
      userId: decoded.userId,
      action: 'PERMISSION_REMOVED',
      resourceType: 'permission',
      resourceId: permissionId,
      details: {
        targetUserId: userId,
        permissionId
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
    
    return NextResponse.json({
      success: true,
      message: 'Permission removed successfully'
    });
    
  } catch (error) {
    console.error('[PERMISSIONS API] Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}