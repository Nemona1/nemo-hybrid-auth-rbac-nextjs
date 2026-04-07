import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePasswordStrength, logSecurityEvent } from '@/lib/auth/security';
import { sendVerificationEmail } from '@/lib/email/sendEmail';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password } = body;
    
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
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: 'Password too weak', details: passwordValidation.errors },
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
          warning: 'User created but verification email failed. Please contact support.',
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
        message: 'Registration successful. Please check your email for verification link.',
        requiresVerification: true
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}