import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/auth/permissions';
import { sendRoleDecisionEmail } from '@/lib/email/sendVerificationEmail';

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
    
    const hasAdminAccess = await hasPermission(decoded.userId, 'users:read');
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const users = await prisma.user.findMany({
      include: {
        role: true,
        roleApplication: {
          include: {
            requestedRole: true
          }
        },
        directPermissions: {
          include: {
            permission: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isVerified: user.isVerified,
      applicationStatus: user.applicationStatus,
      role: user.role,
      roleApplication: user.roleApplication,
      directPermissions: user.directPermissions,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt
    }));
    
    return NextResponse.json(sanitizedUsers);
    
  } catch (error) {
    console.error('Admin users fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const { userId, roleId, applicationStatus, applicationId, reviewReason } = await request.json();
    
    const accessToken = request.cookies.get('accessToken')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid, decoded } = await verifyAccessToken(accessToken);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const hasAdminAccess = await hasPermission(decoded.userId, 'users:update');
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Update user role
    if (roleId) {
      await prisma.user.update({
        where: { id: userId },
        data: { roleId }
      });
    }
    
    // Update role application status
    if (applicationStatus && applicationId) {
      const application = await prisma.roleApplication.update({
        where: { id: applicationId },
        data: {
          status: applicationStatus,
          reviewedBy: decoded.userId,
          reviewedAt: new Date(),
          reviewedReason: reviewReason
        },
        include: {
          user: true,
          requestedRole: true
        }
      });
      
      // If approved, assign role to user
      if (applicationStatus === 'APPROVED') {
        await prisma.user.update({
          where: { id: userId },
          data: {
            roleId: application.requestedRoleId,
            applicationStatus: 'APPROVED'
          }
        });
        
        // Send approval email
        await sendRoleDecisionEmail(
          application.user.email,
          application.user.firstName,
          application.requestedRole.name,
          'APPROVED',
          reviewReason
        );
      } else if (applicationStatus === 'REJECTED') {
        await prisma.user.update({
          where: { id: userId },
          data: { applicationStatus: 'REJECTED' }
        });
        
        // Send rejection email
        await sendRoleDecisionEmail(
          application.user.email,
          application.user.firstName,
          application.requestedRole.name,
          'REJECTED',
          reviewReason
        );
      }
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}