// Secure JWT Implementation with Refresh Token Rotation
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export function generateAccessToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    version: user.refreshTokenVersion,
    type: 'access'
  };
  
  console.log('[JWT] Generating access token for user:', user.id, 'version:', user.refreshTokenVersion);
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'nemo-auth',
    audience: 'nemo-app'
  });
}

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

export async function verifyAccessToken(token) {
  try {
    console.log('[JWT] Verifying token, length:', token?.length);
    
    if (!token) {
      console.log('[JWT] No token provided');
      return { valid: false, error: 'No token provided' };
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'nemo-auth',
      audience: 'nemo-app'
    });
    
    console.log('[JWT] Decoded token:', { 
      userId: decoded.userId, 
      type: decoded.type, 
      version: decoded.version,
      email: decoded.email 
    });
    
    if (decoded.type !== 'access') {
      console.log('[JWT] Invalid token type:', decoded.type);
      return { valid: false, error: 'Invalid token type' };
    }
    
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
      console.log('[JWT] User not found:', decoded.userId);
      return { valid: false, error: 'User not found' };
    }
    
    if (!user.isVerified) {
      console.log('[JWT] Email not verified for user:', decoded.userId);
      return { valid: false, error: 'Email not verified' };
    }
    
    if (user.refreshTokenVersion !== decoded.version) {
      console.log('[JWT] Version mismatch. Stored:', user.refreshTokenVersion, 'Token:', decoded.version);
      return { valid: false, error: 'Token version mismatch - please login again' };
    }
    
    console.log('[JWT] Token valid for user:', decoded.userId);
    return { valid: true, decoded, user };
    
  } catch (error) {
    console.error('[JWT] Verification error:', error.message);
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, error: 'Token expired' };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, error: 'Invalid token: ' + error.message };
    }
    return { valid: false, error: 'Token verification failed: ' + error.message };
  }
}

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
    console.error('[JWT] Refresh rotation error:', error.message);
    return { success: false, error: 'Invalid refresh token' };
  }
}