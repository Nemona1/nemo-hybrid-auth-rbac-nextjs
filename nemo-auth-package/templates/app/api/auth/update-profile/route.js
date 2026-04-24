import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { logSecurityEvent, SecurityActions } from '@/lib/security-log';
import { sendVerificationEmail } from '@/lib/email/sendVerificationEmail';
import crypto from 'crypto';

export async function PUT(request) {
  try {
    const { firstName, lastName, email } = await request.json();
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
    
    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Check if email is being changed
    const isEmailChanging = email && email !== currentUser.email;
    
    // If email is changing, check if it's already taken
    if (isEmailChanging) {
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
    }
    
    // Prepare update data
    const updateData = {
      firstName: firstName || currentUser.firstName,
      lastName: lastName || currentUser.lastName,
    };
    
    // If email is changing, set as unverified and generate verification token
    if (isEmailChanging) {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      updateData.email = email;
      updateData.isVerified = false;
      updateData.verificationToken = verificationToken;
      updateData.verificationExpiry = verificationExpiry;
      
      // Log security event for email change request
      await logSecurityEvent({
        userId: decoded.userId,
        action: SecurityActions.EMAIL_CHANGE_REQUESTED,
        ipAddress,
        userAgent,
        details: { 
          oldEmail: currentUser.email,
          newEmail: email,
          requiresReVerification: true
        },
        success: true
      });
      
      // Send verification email to new email address
      const emailSent = await sendVerificationEmail(email, verificationToken, firstName || currentUser.firstName);
      
      if (!emailSent) {
        await logSecurityEvent({
          userId: decoded.userId,
          action: SecurityActions.EMAIL_CHANGE_REQUESTED,
          ipAddress,
          userAgent,
          details: { 
            oldEmail: currentUser.email,
            newEmail: email,
            reason: 'Email send failed'
          },
          success: false
        });
        
        return NextResponse.json({ 
          error: 'Failed to send verification email. Please try again.' 
        }, { status: 500 });
      }
    }
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: updateData
    });
    
    // Create audit log
    await createAuditLog({
      userId: decoded.userId,
      action: isEmailChanging ? 'PROFILE_UPDATED_EMAIL_CHANGED' : 'PROFILE_UPDATED',
      resourceType: 'user',
      resourceId: decoded.userId,
      details: { 
        firstName, 
        lastName, 
        email: isEmailChanging ? email : undefined,
        oldEmail: isEmailChanging ? currentUser.email : undefined
      },
      ipAddress,
      userAgent
    });
    
    // If email was changed, invalidate current session and require re-login
    if (isEmailChanging) {
      return NextResponse.json({
        success: true,
        requiresVerification: true,
        message: 'Profile updated. A verification link has been sent to your new email address. Please verify your email to continue using the account.'
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}