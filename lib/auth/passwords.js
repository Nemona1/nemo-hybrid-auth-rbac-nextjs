// Password Management Utilities
// Handles password reset tokens, validation, and secure generation

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePasswordStrength } from './security';

/**
 * Generate a secure password reset token
 * @returns {string} Secure random token
 */
export function generatePasswordResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set password reset token for a user
 * @param {string} email - User email
 * @param {number} expiryMinutes - Token expiry in minutes (default: 60)
 * @returns {Promise<{token: string, expiry: Date}>}
 */
export async function setPasswordResetToken(email, expiryMinutes = 60) {
  const token = generatePasswordResetToken();
  const expiry = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  await prisma.user.update({
    where: { email },
    data: {
      passwordResetToken: token,
      passwordResetExpiry: expiry
    }
  });
  
  return { token, expiry };
}

/**
 * Verify password reset token
 * @param {string} token - Reset token to verify
 * @returns {Promise<{valid: boolean, user?: any, error?: string}>}
 */
export async function verifyPasswordResetToken(token) {
  if (!token) {
    return { valid: false, error: 'No token provided' };
  }
  
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiry: { gt: new Date() }
    }
  });
  
  if (!user) {
    return { valid: false, error: 'Invalid or expired reset token' };
  }
  
  return { valid: true, user };
}

/**
 * Reset user password using token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function resetPasswordWithToken(token, newPassword) {
  // Verify token
  const { valid, user, error } = await verifyPasswordResetToken(token);
  
  if (!valid) {
    return { success: false, error: error || 'Invalid or expired token' };
  }
  
  // Validate password strength
  const validation = validatePasswordStrength(newPassword);
  if (!validation.isValid) {
    return { success: false, error: validation.errors[0] };
  }
  
  // Hash new password
  const hashedPassword = await hashPassword(newPassword);
  
  // Update user password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null,
      refreshTokenVersion: { increment: 1 } // Invalidate all sessions
    }
  });
  
  return { success: true };
}

/**
 * Clear password reset token for a user
 * @param {string} email - User email
 */
export async function clearPasswordResetToken(email) {
  await prisma.user.update({
    where: { email },
    data: {
      passwordResetToken: null,
      passwordResetExpiry: null
    }
  });
}

/**
 * Check if password reset token is valid and not expired
 * @param {string} token - Reset token
 * @returns {Promise<boolean>}
 */
export async function isPasswordResetTokenValid(token) {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiry: { gt: new Date() }
    }
  });
  
  return !!user;
}

/**
 * Generate a secure random password (for testing or temporary accounts)
 * @param {number} length - Password length (default: 12)
 * @returns {string} Random secure password
 */
export function generateSecurePassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}