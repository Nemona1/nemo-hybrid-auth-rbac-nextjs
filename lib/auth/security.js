// Comprehensive Security Utility Module
// Implements brute-force protection, password security, and audit logging

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// Brute Force Protection Configuration
const BRUTE_FORCE = {
  MAX_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '3'),
  LOCKOUT_DURATION: parseInt(process.env.LOCKOUT_DURATION_SECONDS || '30') * 1000,
};

// Password Strength Requirements (OWASP compliant)
const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL: true
};

/**
 * Check if user is currently locked out due to failed attempts
 * Implements sliding window lockout mechanism
 */
export async function isUserLockedOut(email) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { lockoutUntil: true, failedLoginAttempts: true }
  });
  
  if (!user) return false;
  
  // Check if lockout period has expired
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    return true;
  }
  
  // Reset lockout if expired
  if (user.lockoutUntil && user.lockoutUntil <= new Date()) {
    await prisma.user.update({
      where: { email },
      data: { 
        lockoutUntil: null,
        failedLoginAttempts: 0 
      }
    });
    return false;
  }
  
  return false;
}

/**
 * Handle failed login attempt with progressive lockout
 * Returns: { locked: boolean, remainingAttempts: number, lockoutTime?: number }
 */
export async function handleFailedLogin(email, ipAddress, userAgent) {
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
  if (!user) return { locked: false, remainingAttempts: BRUTE_FORCE.MAX_ATTEMPTS };
  
  const newAttemptCount = user.failedLoginAttempts + 1;
  const shouldLockout = newAttemptCount >= BRUTE_FORCE.MAX_ATTEMPTS;
  
  // Log security event
  await prisma.securityLog.create({
    data: {
      userId: user.id,
      action: 'LOGIN_ATTEMPT',
      ipAddress,
      userAgent,
      details: { attemptCount: newAttemptCount, locked: shouldLockout },
      success: false
    }
  });
  
  if (shouldLockout) {
    const lockoutUntil = new Date(Date.now() + BRUTE_FORCE.LOCKOUT_DURATION);
    
    await prisma.user.update({
      where: { email },
      data: {
        failedLoginAttempts: newAttemptCount,
        lockoutUntil
      }
    });
    
    return {
      locked: true,
      lockoutTime: BRUTE_FORCE.LOCKOUT_DURATION / 1000,
      remainingAttempts: 0
    };
  }
  
  await prisma.user.update({
    where: { email },
    data: { failedLoginAttempts: newAttemptCount }
  });
  
  return {
    locked: false,
    remainingAttempts: BRUTE_FORCE.MAX_ATTEMPTS - newAttemptCount
  };
}

/**
 * Reset failed attempts on successful login
 */
export async function resetFailedAttempts(email) {
  await prisma.user.update({
    where: { email },
    data: {
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: new Date(),
      lastActivityAt: new Date()
    }
  });
}

/**
 * Validate password strength using OWASP recommendations
 */
export function validatePasswordStrength(password) {
  const errors = [];
  
  if (password.length < PASSWORD_REQUIREMENTS.MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`);
  }
  
  if (PASSWORD_REQUIREMENTS.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (PASSWORD_REQUIREMENTS.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (PASSWORD_REQUIREMENTS.REQUIRE_NUMBERS && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (PASSWORD_REQUIREMENTS.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common patterns
  const commonPatterns = ['password', '123456', 'qwerty', 'admin', 'letmein'];
  if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    errors.push('Password contains common insecure patterns');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Hash password using bcrypt with appropriate salt rounds
 */
export async function hashPassword(password) {
  const saltRounds = 12; // Industry standard for 2024
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Log security-critical actions for audit trail
 */
export async function logSecurityEvent({ userId, action, details, success, req }) {
  const ipAddress = req?.headers?.get('x-forwarded-for') || 
                    req?.headers?.get('x-real-ip') || 
                    'unknown';
  
  const userAgent = req?.headers?.get('user-agent') || 'unknown';
  
  await prisma.securityLog.create({
    data: {
      userId,
      action,
      ipAddress,
      userAgent,
      details: details || {},
      success
    }
  });
}