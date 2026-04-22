// Central export file for all auth utilities

// JWT functions
export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  rotateRefreshToken
} from './jwt';

// Security functions
export {
  isUserLockedOut,
  handleFailedLogin,
  resetFailedAttempts,
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
  logSecurityEvent
} from './security';

// Password management functions
export {
  generatePasswordResetToken,
  setPasswordResetToken,
  verifyPasswordResetToken,
  resetPasswordWithToken,
  clearPasswordResetToken,
  isPasswordResetTokenValid,
  generateSecurePassword
} from './passwords';

// Permission functions
export {
  hasPermission,
  getUserPermissions,
  requirePermission
} from './permissions';