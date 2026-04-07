import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/auth/permissions';

export async function GET(request) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid, decoded } = await verifyAccessToken(accessToken);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const hasAccess = await hasPermission(decoded.userId, 'roles:read');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
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
      }
    });
    
    const permissions = await prisma.permission.findMany();
    
    return NextResponse.json({ roles, permissions });
    
  } catch (error) {
    console.error('Roles fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, description, permissionIds } = await request.json();
    
    const accessToken = request.cookies.get('accessToken')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid, decoded } = await verifyAccessToken(accessToken);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const hasAccess = await hasPermission(decoded.userId, 'roles:create');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const role = await prisma.role.create({
      data: {
        name: name.toUpperCase(),
        description,
        isSystem: false,
        permissions: {
          create: permissionIds.map(permissionId => ({
            permissionId,
            grantedBy: decoded.userId
          }))
        }
      }
    });
    
    return NextResponse.json(role, { status: 201 });
    
  } catch (error) {
    console.error('Role creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, name, description, permissionIds } = await request.json();
    
    const accessToken = request.cookies.get('accessToken')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid, decoded } = await verifyAccessToken(accessToken);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const hasAccess = await hasPermission(decoded.userId, 'roles:update');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const existingRole = await prisma.role.findUnique({ where: { id } });
    if (existingRole.isSystem) {
      return NextResponse.json({ error: 'Cannot modify system role' }, { status: 403 });
    }
    
    const role = await prisma.role.update({
      where: { id },
      data: {
        name: name?.toUpperCase(),
        description,
        permissions: {
          deleteMany: {},
          create: permissionIds.map(permissionId => ({
            permissionId,
            grantedBy: decoded.userId
          }))
        }
      }
    });
    
    return NextResponse.json(role);
    
  } catch (error) {
    console.error('Role update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const accessToken = request.cookies.get('accessToken')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid, decoded } = await verifyAccessToken(accessToken);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const hasAccess = await hasPermission(decoded.userId, 'roles:delete');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const role = await prisma.role.findUnique({ where: { id } });
    if (role.isSystem) {
      return NextResponse.json({ error: 'Cannot delete system role' }, { status: 403 });
    }
    
    await prisma.role.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Role delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}