import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePasswordStrength, logSecurityEvent } from '@/lib/auth/security';
import { logSecurityEvent as logSecurity, SecurityActions } from '@/lib/security-log';
import { createAuditLog, AuditActions } from '@/lib/audit';
import { sendVerificationEmail } from '@/lib/email/sendVerificationEmail';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password } = body;
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address (e.g., name@domain.com)' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please login instead.' },
        { status: 409 }
      );
    }
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.errors[0] },
        { status: 400 }
      );
    }
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        verificationToken,
        verificationExpiry
      }
    });
    
    // Log security event for user registration
    await logSecurity({
      userId: user.id,
      action: SecurityActions.USER_REGISTERED,
      ipAddress,
      userAgent,
      details: { email },
      success: true
    });
    
    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: AuditActions.USER_CREATED,
      resourceType: 'user',
      resourceId: user.id,
      details: { email, firstName, lastName },
      ipAddress,
      userAgent
    });
    
    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationToken, firstName);
    
    if (!emailSent) {
      await logSecurityEvent({
        userId: user.id,
        action: 'EMAIL_SEND_FAILED',
        details: { email },
        success: false,
        req: request
      });
      
      return NextResponse.json(
        { 
          success: true, 
          warning: 'Account created but verification email could not be sent. Please contact support.',
          requiresVerification: true 
        },
        { status: 201 }
      );
    }
    
    await logSecurityEvent({
      userId: user.id,
      action: 'USER_REGISTERED',
      details: { email },
      success: true,
      req: request
    });
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Registration successful! Please check your email for verification link.',
        requiresVerification: true
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}