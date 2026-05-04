import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken, verifyPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { sendVerificationEmail } from '@/lib/email/sendVerificationEmail';
import crypto from 'crypto';

export async function PUT(request) {
  try {
    const { firstName, lastName, email, currentPassword } = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Validate required fields
    if (!currentPassword) {
      return NextResponse.json({ 
        error: 'Current password is required to update profile' 
      }, { status: 400 });
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
    
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Re-authentication: Verify current password
    const isPasswordValid = await verifyPassword(currentPassword, currentUser.passwordHash);
    if (!isPasswordValid) {
      await logSecurityEvent({
        userId: decoded.userId,
        action: SecurityActions.PROFILE_UPDATE_FAILED,
        ipAddress,
        userAgent,
        details: { reason: 'Invalid password' },
        success: false
      });
      
      return NextResponse.json({ 
        error: 'Current password is incorrect' 
      }, { status: 401 });
    }
    
    const isEmailChanging = email && email !== currentUser.email;
    const isNameChanging = (firstName && firstName !== currentUser.firstName) || 
                          (lastName && lastName !== currentUser.lastName);
    
    // Update name if changed
    if (isNameChanging) {
      await prisma.user.update({
        where: { id: decoded.userId },
        data: {
          firstName: firstName || currentUser.firstName,
          lastName: lastName || currentUser.lastName
        }
      });
      
      await createAuditLog({
        userId: decoded.userId,
        action: 'PROFILE_UPDATED',
        resourceType: 'user',
        resourceId: decoded.userId,
        details: { firstName, lastName },
        ipAddress,
        userAgent
      });
    }
    
    // Handle email change with pending verification
    if (isEmailChanging) {
      // Check if new email is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: decoded.userId }
        }
      });
      
      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
      }
      
      // Generate verification token for pending email
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Store pending email without changing primary email
      await prisma.user.update({
        where: { id: decoded.userId },
        data: {
          pendingEmail: email,
          pendingEmailToken: verificationToken,
          pendingEmailExpiry: verificationExpiry
        }
      });
      
      // Send verification email to the NEW email address
      const emailSent = await sendVerificationEmail(
        email, 
        verificationToken, 
        firstName || currentUser.firstName,
        'email-change'
      );
      
      if (!emailSent) {
        // Clear pending email if sending fails
        await prisma.user.update({
          where: { id: decoded.userId },
          data: {
            pendingEmail: null,
            pendingEmailToken: null,
            pendingEmailExpiry: null
          }
        });
        
        return NextResponse.json({ 
          error: 'Failed to send verification email. Please try again.' 
        }, { status: 500 });
      }
      
      await logSecurityEvent({
        userId: decoded.userId,
        action: SecurityActions.EMAIL_CHANGE_REQUESTED,
        ipAddress,
        userAgent,
        details: { 
          oldEmail: currentUser.email,
          newEmail: email,
          requiresVerification: true
        },
        success: true
      });
      
      await createAuditLog({
        userId: decoded.userId,
        action: 'EMAIL_CHANGE_REQUESTED',
        resourceType: 'user',
        resourceId: decoded.userId,
        details: { oldEmail: currentUser.email, newEmail: email },
        ipAddress,
        userAgent
      });
      
      return NextResponse.json({
        success: true,
        requiresVerification: true,
        message: 'A verification link has been sent to your new email address. Please verify it to complete the email change. Your current email remains active until verification.'
      });
    }
    
    // No email change, just name update
    if (isNameChanging) {
      return NextResponse.json({
        success: true,
        message: 'Profile updated successfully'
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'No changes detected'
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}