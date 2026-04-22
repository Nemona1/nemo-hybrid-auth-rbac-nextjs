// ===========================================
// NEMO AUTH NEXT.JS - Enterprise Authentication
// ===========================================

// JWT Authentication
export { 
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  rotateRefreshToken
} from './lib/auth/jwt';

// Password Management
export {
  generatePasswordResetToken,
  setPasswordResetToken,
  verifyPasswordResetToken,
  resetPasswordWithToken,
  clearPasswordResetToken,
  isPasswordResetTokenValid,
  generateSecurePassword
} from './lib/auth/passwords';

// 2FA (Two-Factor Authentication)
export {
  generateOtp,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
  generateDeviceFingerprint,
  getDeviceType,
  getDeviceName,
  storeOtp,
  verifyStoredOtp
} from './lib/auth/2fa';

// Security & Password Validation
export {
  isUserLockedOut,
  handleFailedLogin,
  resetFailedAttempts,
  validatePasswordStrength,
  hashPassword,
  verifyPassword
} from './lib/auth/security';

// Permissions (only exports that exist)
export {
  hasPermission,
  getUserPermissions,
  requirePermission
} from './lib/auth/permissions';

// Audit Logging
export { 
  createAuditLog, 
  getAuditLogs, 
  AuditActions 
} from './lib/audit';

// Security Logging
export { 
  logSecurityEvent, 
  getSecurityLogs, 
  SecurityActions 
} from './lib/security-log';

// Database
export { prisma } from './lib/prisma';

// Constants
export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER'
};

export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  ROLES_READ: 'roles:read',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  CONTENT_CREATE: 'content:create',
  CONTENT_EDIT: 'content:edit',
  CONTENT_DELETE: 'content:delete',
  CONTENT_PUBLISH: 'content:publish',
  CONTENT_VIEW: 'content:view',
  ADMIN_ACCESS: 'admin:access',
  AUDIT_READ: 'audit:read'
};

export const VERSION = '1.0.0';

// Default export
export default {
  VERSION,
  ROLES,
  PERMISSIONS,
  prisma,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  hasPermission,
  requirePermission,
  createAuditLog,
  logSecurityEvent,
  AuditActions,
  SecurityActions
};

