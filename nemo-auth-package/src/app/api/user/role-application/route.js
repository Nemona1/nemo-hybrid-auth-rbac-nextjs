import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { createAuditLog } from '@/lib/audit';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { sendRoleApplicationSubmittedEmail } from '@/lib/email/roleDecisionEmail';

export async function POST(request) {
  try {
    const { requestedRoleId, justification } = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Validate input
    if (!requestedRoleId) {
      return NextResponse.json({ error: 'Role selection is required' }, { status: 400 });
    }
    
    // Get token from Authorization header
    let token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid, decoded } = await verifyAccessToken(token);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Get user details for email
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { email: true, firstName: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
    
    // Get the requested role
    const requestedRole = await prisma.role.findUnique({
      where: { id: requestedRoleId }
    });
    
    if (!requestedRole) {
      return NextResponse.json({ error: 'Invalid role selected' }, { status: 400 });
    }
    
    // Create role application
    const application = await prisma.roleApplication.create({
      data: {
        userId: decoded.userId,
        requestedRoleId,
        justification: justification || '',
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
    
    // Log security event for role application submission
    await logSecurityEvent({
      userId: decoded.userId,
      action: SecurityActions.ROLE_APPLICATION_SUBMITTED,
      ipAddress,
      userAgent,
      details: {
        requestedRole: requestedRole.name,
        justification: justification ? justification.substring(0, 100) : null
      },
      success: true
    });
    
    // Send confirmation email to user
    await sendRoleApplicationSubmittedEmail(
      user.email,
      user.firstName,
      requestedRole.name,
      application.id
    );
    
    // Create audit log
    await createAuditLog({
      userId: decoded.userId,
      action: 'ROLE_APPLICATION_SUBMITTED',
      resourceType: 'role_application',
      resourceId: application.id,
      details: { requestedRoleId, justification, roleName: requestedRole.name },
      ipAddress,
      userAgent
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Application submitted successfully',
      data: application 
    }, { status: 201 });
    
  } catch (error) {
    console.error('Role application error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    let token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { valid, decoded } = await verifyAccessToken(token);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    const application = await prisma.roleApplication.findUnique({
      where: { userId: decoded.userId },
      include: {
        requestedRole: true
      }
    });
    
    // Get rejection history
    let rejections = [];
    try {
      rejections = await prisma.roleApplicationRejection.findMany({
        where: { userId: decoded.userId },
        include: {
          requestedRole: true
        },
        orderBy: { rejectedAt: 'desc' }
      });
    } catch (err) {
      console.log('Rejection history not available');
    }
    
    // Log security event for viewing application status
    await logSecurityEvent({
      userId: decoded.userId,
      action: SecurityActions.ROLE_APPLICATION_STATUS_VIEWED,
      ipAddress,
      userAgent,
      details: {
        hasApplication: !!application,
        applicationStatus: application?.status,
        rejectionCount: rejections.length
      },
      success: true
    });
    
    return NextResponse.json({ application, rejections });
    
  } catch (error) {
    console.error('Fetch application error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}