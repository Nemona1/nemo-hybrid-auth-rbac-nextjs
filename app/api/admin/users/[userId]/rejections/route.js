import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/auth/permissions';

export async function GET(request, { params }) {
  try {
    const { userId } = await params;
    
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