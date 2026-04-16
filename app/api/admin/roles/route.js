import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/auth/permissions';
import { createAuditLog } from '@/lib/audit';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';

export async function GET(request) {
  try {
    console.log('[ROLES API] ========== START ==========');
    
    // Get token from Authorization header or cookie
    let token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      token = request.cookies.get('accessToken')?.value;
    }
    
    console.log('[ROLES API] Token exists:', !!token);
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid, decoded } = await verifyAccessToken(token);
    console.log('[ROLES API] Token valid:', valid);
    
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const hasAccess = await hasPermission(decoded.userId, 'roles:read');
    console.log('[ROLES API] Has access:', hasAccess);
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Fetch roles
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log('[ROLES API] Found roles:', roles.length);
    
    // Fetch permissions - FIXED orderBy syntax
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
    
    console.log('[ROLES API] Found permissions:', permissions.length);
    console.log('[ROLES API] ========== END ==========');
    
    return NextResponse.json({ roles, permissions });
    
  } catch (error) {
    console.error('[ROLES API] Fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { name, description, permissionIds } = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Role name is required' },
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
    
    const hasAccess = await hasPermission(decoded.userId, 'roles:create');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Check if role already exists
    const existingRole = await prisma.role.findUnique({
      where: { name: name.toUpperCase() }
    });
    
    if (existingRole) {
      return NextResponse.json(
        { error: 'A role with this name already exists' },
        { status: 409 }
      );
    }
    
    const role = await prisma.role.create({
      data: {
        name: name.toUpperCase(),
        description: description || '',
        isSystem: false,
        permissions: {
          create: permissionIds?.map(permissionId => ({
            permissionId,
            grantedBy: decoded.userId
          })) || []
        }
      }
    });
    
    // Log security event for role creation
    await logSecurityEvent({
      userId: decoded.userId,
      action: SecurityActions.ROLE_CREATED,
      ipAddress,
      userAgent,
      details: { roleName: name, description, permissionCount: permissionIds?.length || 0 },
      success: true
    });
    
    // Create audit log
    await createAuditLog({
      userId: decoded.userId,
      action: 'ROLE_CREATED',
      resourceType: 'role',
      resourceId: role.id,
      details: { name, description, permissionIds },
      ipAddress,
      userAgent
    });
    
    return NextResponse.json({
      success: true,
      message: 'Role created successfully',
      data: role
    }, { status: 201 });
    
  } catch (error) {
    console.error('[ROLES API] Create error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const { id, name, description, permissionIds } = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    if (!id) {
      return NextResponse.json(
        { error: 'Role ID is required' },
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
    
    const hasAccess = await hasPermission(decoded.userId, 'roles:update');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const existingRole = await prisma.role.findUnique({ where: { id } });
    if (!existingRole) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }
    
    if (existingRole.isSystem) {
      return NextResponse.json(
        { error: 'Cannot modify system role' },
        { status: 403 }
      );
    }
    
    const role = await prisma.role.update({
      where: { id },
      data: {
        name: name?.toUpperCase(),
        description: description || '',
        permissions: {
          deleteMany: {},
          create: permissionIds?.map(permissionId => ({
            permissionId,
            grantedBy: decoded.userId
          })) || []
        }
      }
    });
    
    // Log security event for role update
    await logSecurityEvent({
      userId: decoded.userId,
      action: SecurityActions.ROLE_UPDATED,
      ipAddress,
      userAgent,
      details: { roleId: id, roleName: name, permissionCount: permissionIds?.length || 0 },
      success: true
    });
    
    // Create audit log
    await createAuditLog({
      userId: decoded.userId,
      action: 'ROLE_UPDATED',
      resourceType: 'role',
      resourceId: role.id,
      details: { name, description, permissionIds },
      ipAddress,
      userAgent
    });
    
    return NextResponse.json({
      success: true,
      message: 'Role updated successfully',
      data: role
    });
    
  } catch (error) {
    console.error('[ROLES API] Update error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    if (!id) {
      return NextResponse.json(
        { error: 'Role ID is required' },
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
    
    const hasAccess = await hasPermission(decoded.userId, 'roles:delete');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }
    
    if (role.isSystem) {
      return NextResponse.json(
        { error: 'Cannot delete system role' },
        { status: 403 }
      );
    }
    
    // Check if role has users assigned
    const userCount = await prisma.user.count({ where: { roleId: id } });
    if (userCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete role. It is currently assigned to ${userCount} user(s).` },
        { status: 409 }
      );
    }
    
    await prisma.role.delete({ where: { id } });
    
    // Log security event for role deletion
    await logSecurityEvent({
      userId: decoded.userId,
      action: SecurityActions.ROLE_DELETED,
      ipAddress,
      userAgent,
      details: { roleId: id, roleName: role.name, hadUsers: userCount > 0 },
      success: true
    });
    
    // Create audit log
    await createAuditLog({
      userId: decoded.userId,
      action: 'ROLE_DELETED',
      resourceType: 'role',
      resourceId: id,
      details: { roleName: role.name },
      ipAddress,
      userAgent
    });
    
    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully'
    });
    
  } catch (error) {
    console.error('[ROLES API] Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}