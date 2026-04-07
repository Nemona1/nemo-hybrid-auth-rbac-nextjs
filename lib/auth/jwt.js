// Secure JWT Implementation with Refresh Token Rotation
// Implements stateless authentication with refresh token versioning

import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived for security
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    version: user.refreshTokenVersion,
    type: 'access'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'nemo-auth',
    audience: 'nemo-app'
  });
}

/**
 * Generate refresh token with version control for invalidation
 */
export function generateRefreshToken(user) {
  const payload = {
    userId: user.id,
    version: user.refreshTokenVersion,
    type: 'refresh'
  };
  
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'nemo-auth',
    audience: 'nemo-app'
  });
}

/**
 * Verify access token with comprehensive validation
 */
export async function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'nemo-auth',
      audience: 'nemo-app'
    });
    
    // Verify token type
    if (decoded.type !== 'access') {
      return { valid: false, error: 'Invalid token type' };
    }
    
    // Check if user still exists and token version matches
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        refreshTokenVersion: true, 
        isVerified: true, 
        applicationStatus: true, 
        roleId: true 
      }
    });
    
    if (!user) {
      return { valid: false, error: 'User not found' };
    }
    
    if (!user.isVerified) {
      return { valid: false, error: 'Email not verified' };
    }
    
    if (user.refreshTokenVersion !== decoded.version) {
      return { valid: false, error: 'Token version mismatch - please login again' };
    }
    
    return { valid: true, decoded, user };
    
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, error: 'Token expired' };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, error: 'Invalid token' };
    }
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * Verify refresh token and generate new token pair
 */
export async function rotateRefreshToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
      issuer: 'nemo-auth',
      audience: 'nemo-app'
    });
    
    if (decoded.type !== 'refresh') {
      return { success: false, error: 'Invalid token type' };
    }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user || user.refreshTokenVersion !== decoded.version) {
      return { success: false, error: 'Invalid refresh token' };
    }
    
    // Increment token version to invalidate old tokens
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenVersion: { increment: 1 } }
    });
    
    const newAccessToken = generateAccessToken(updatedUser);
    const newRefreshToken = generateRefreshToken(updatedUser);
    
    return {
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
    
  } catch (error) {
    return { success: false, error: 'Invalid refresh token' };
  }
}