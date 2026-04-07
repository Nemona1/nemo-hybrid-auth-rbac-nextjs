import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';

export async function POST(request) {
  try {
    const { requestedRoleId, justification } = await request.json();
    
    const accessToken = request.cookies.get('accessToken')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid, decoded } = await verifyAccessToken(accessToken);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Check if user already has an application
    const existingApplication = await prisma.roleApplication.findUnique({
      where: { userId: decoded.userId }
    });
    
    if (existingApplication) {
      return NextResponse.json(
        { error: 'You already have a pending or processed application' },
        { status: 400 }
      );
    }
    
    // Create role application
    const application = await prisma.roleApplication.create({
      data: {
        userId: decoded.userId,
        requestedRoleId,
        justification,
        status: 'PENDING'
      },
      include: {
        requestedRole: true
      }
    });
    
    // Update user application status
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { applicationStatus: 'PENDING' }
    });
    
    return NextResponse.json(application, { status: 201 });
    
  } catch (error) {
    console.error('Role application error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    
    const application = await prisma.roleApplication.findUnique({
      where: { userId: decoded.userId },
      include: {
        requestedRole: true
      }
    });
    
    return NextResponse.json(application || null);
    
  } catch (error) {
    console.error('Fetch application error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}