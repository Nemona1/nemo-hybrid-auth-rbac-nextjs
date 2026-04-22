import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/auth/permissions';
import { sendRoleApprovalEmail, sendRoleRejectionEmail } from '@/lib/email/roleDecisionEmail';
import { createAuditLog } from '@/lib/audit';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';

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
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
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
    
    const hasAdminAccess = await hasPermission(decoded.userId, 'users:update');
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get admin user info for email
    const adminUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { firstName: true, lastName: true, email: true }
    });
    const adminName = `${adminUser?.firstName || 'System'} ${adminUser?.lastName || 'Administrator'}`;
    
    // Get target user info for security log
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true }
    });
    
    // Update user role
    if (roleId) {
      await prisma.user.update({
        where: { id: userId },
        data: { roleId }
      });
      
      // Log security event for role assignment
      await logSecurityEvent({
        userId: decoded.userId,
        action: SecurityActions.ROLE_ASSIGNED,
        ipAddress,
        userAgent,
        details: {
          targetUserId: userId,
          targetUserEmail: targetUser?.email,
          newRoleId: roleId,
          assignedBy: adminUser?.email
        },
        success: true
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
        
        // Log security event for role application approval
        await logSecurityEvent({
          userId: decoded.userId,
          action: SecurityActions.ROLE_APPLICATION_APPROVED,
          ipAddress,
          userAgent,
          details: {
            targetUserId: userId,
            targetUserEmail: application.user.email,
            requestedRole: application.requestedRole.name,
            reason: reviewReason
          },
          success: true
        });
        
        // Send approval email
        await sendRoleApprovalEmail(
          application.user.email,
          application.user.firstName,
          application.requestedRole.name,
          adminName,
          new Date()
        );
        
        // Create audit log
        await createAuditLog({
          userId: decoded.userId,
          action: 'ROLE_APPLICATION_APPROVED',
          resourceType: 'role_application',
          resourceId: applicationId,
          details: { userId, roleId: application.requestedRoleId, reason: reviewReason },
          ipAddress,
          userAgent
        });
        
      } else if (applicationStatus === 'REJECTED') {
        await prisma.user.update({
          where: { id: userId },
          data: { applicationStatus: 'REJECTED' }
        });
        
        // Log security event for role application rejection
        await logSecurityEvent({
          userId: decoded.userId,
          action: SecurityActions.ROLE_APPLICATION_REJECTED,
          ipAddress,
          userAgent,
          details: {
            targetUserId: userId,
            targetUserEmail: application.user.email,
            requestedRole: application.requestedRole.name,
            reason: reviewReason
          },
          success: true
        });
        
        // Store rejection history (if model exists)
        try {
          if (prisma.roleApplicationRejection) {
            await prisma.roleApplicationRejection.create({
              data: {
                roleApplicationId: applicationId,
                userId: userId,
                requestedRoleId: application.requestedRoleId,
                reason: reviewReason || 'No specific reason provided',
                rejectedBy: decoded.userId
              }
            });
          }
        } catch (err) {
          console.log('Rejection model not available, skipping history');
        }
        
        // Send rejection email
        await sendRoleRejectionEmail(
          application.user.email,
          application.user.firstName,
          application.requestedRole.name,
          adminName,
          new Date(),
          reviewReason
        );
        
        // Create audit log
        await createAuditLog({
          userId: decoded.userId,
          action: 'ROLE_APPLICATION_REJECTED',
          resourceType: 'role_application',
          resourceId: applicationId,
          details: { userId, roleId: application.requestedRoleId, reason: reviewReason },
          ipAddress,
          userAgent
        });
      }
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}