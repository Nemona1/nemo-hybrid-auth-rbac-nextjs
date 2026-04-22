import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { verifyPassword, hashPassword, validatePasswordStrength } from '@/lib/auth/security';
import { createAuditLog, AuditActions } from '@/lib/audit';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';

export async function POST(request) {
  try {
    const { currentPassword, newPassword } = await request.json();
    
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }
    
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
    
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Get user with current password hash
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      // Log security event for failed password change attempt
      await logSecurityEvent({
        userId: user.id,
        action: SecurityActions.PASSWORD_CHANGE_FAILED_CURRENT_PASSWORD,
        ipAddress,
        userAgent,
        details: { reason: 'Invalid current password' },
        success: false
      });
      
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }
    
    // Validate new password strength
    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.errors[0] }, { status: 400 });
    }
    
    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);
    
    // Update password and increment token version (invalidates all existing sessions)
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        passwordHash: newPasswordHash,
        refreshTokenVersion: { increment: 1 }
      }
    });
    
    // Log security event for successful password change
    await logSecurityEvent({
      userId: user.id,
      action: SecurityActions.PASSWORD_CHANGED_SUCCESSFULLY,
      ipAddress,
      userAgent,
      details: { 
        passwordChanged: true,
        allSessionsInvalidated: true
      },
      success: true
    });
    
    // Create audit log
    await createAuditLog({
      userId: decoded.userId,
      action: AuditActions.PASSWORD_CHANGED,
      resourceType: 'user',
      resourceId: decoded.userId,
      details: { passwordChanged: true },
      ipAddress,
      userAgent
    });
    
    return NextResponse.json({
      success: true,
      message: 'Password changed successfully. You have been logged out from all devices.'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}