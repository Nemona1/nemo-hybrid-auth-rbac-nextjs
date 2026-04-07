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
    
    const hasAccess = await hasPermission(decoded.userId, 'permissions:direct');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const permissions = await prisma.permission.findMany({
      orderBy: { category: 'asc' }
    });
    
    return NextResponse.json(permissions);
    
  } catch (error) {
    console.error('Permissions fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId, permissionId, isGranted = true, expiresAt } = await request.json();
    
    const accessToken = request.cookies.get('accessToken')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid, decoded } = await verifyAccessToken(accessToken);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const hasAccess = await hasPermission(decoded.userId, 'permissions:direct');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
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
    
    return NextResponse.json(userPermission);
    
  } catch (error) {
    console.error('Grant permission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const permissionId = searchParams.get('permissionId');
    
    const accessToken = request.cookies.get('accessToken')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid, decoded } = await verifyAccessToken(accessToken);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const hasAccess = await hasPermission(decoded.userId, 'permissions:direct');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await prisma.userPermission.delete({
      where: {
        userId_permissionId: {
          userId,
          permissionId
        }
      }
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Revoke permission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}