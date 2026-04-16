import { prisma } from '@/lib/prisma';

/**
 * Log security-critical events (authentication, 2FA, password changes, etc.)
 */
export async function logSecurityEvent({
  userId,
  action,
  ipAddress,
  userAgent,
  details = {},
  success = true
}) {
  try {
    await prisma.securityLog.create({
      data: {
        userId: userId || null,
        action,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        details,
        success
      }
    });
  } catch (error) {
    console.error('Failed to create security log:', error);
  }
}

/**
 * Get security logs with filters
 */
export async function getSecurityLogs({
  userId,
  action,
  limit = 100,
  offset = 0,
  fromDate,
  toDate,
  success
}) {
  const where = {};
  
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (success !== undefined) where.success = success;
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(fromDate);
    if (toDate) where.createdAt.lte = new Date(toDate);
  }
  
  const [logs, total] = await Promise.all([
    prisma.securityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.securityLog.count({ where })
  ]);
  
  return { logs, total };
}

/**
 * Security Actions for critical events
 */
export const SecurityActions = {
  // 2FA Security Events
  TWO_FACTOR_SETUP_INITIATED: '2FA_SETUP_INITIATED',
  TWO_FACTOR_ENABLED: '2FA_ENABLED',
  TWO_FACTOR_DISABLED: '2FA_DISABLED',
  TWO_FACTOR_CODE_SENT: '2FA_CODE_SENT',
  TWO_FACTOR_VERIFICATION_SUCCESS: '2FA_VERIFICATION_SUCCESS',
  TWO_FACTOR_VERIFICATION_FAILED: '2FA_VERIFICATION_FAILED',
  TWO_FACTOR_BACKUP_CODE_USED: '2FA_BACKUP_CODE_USED',
  TWO_FACTOR_OTP_REQUEST: '2FA_OTP_REQUEST',
  TWO_FACTOR_RESEND_CODE: '2FA_RESEND_CODE',

    EMAIL_VERIFICATION_RESEND: 'EMAIL_VERIFICATION_RESEND',
    EMAIL_CHANGE_REQUESTED: 'EMAIL_CHANGE_REQUESTED',
      EMAIL_VERIFICATION_FAILED: 'EMAIL_VERIFICATION_FAILED',
  EMAIL_VERIFIED: 'EMAIL_VERIFIED',
  

  AUDIT_EXPORT: 'AUDIT_EXPORT',
   AUDIT_LOG_ACCESS: 'AUDIT_LOG_ACCESS',

     PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  PERMISSION_REVOKED: 'PERMISSION_REVOKED',
  PERMISSION_REMOVED: 'PERMISSION_REMOVED',

  ROLE_CREATED: 'ROLE_CREATED',
  ROLE_UPDATED: 'ROLE_UPDATED',
  ROLE_DELETED: 'ROLE_DELETED',

   SECURITY_LOG_ACCESS: 'SECURITY_LOG_ACCESS',

     ROLE_ASSIGNED: 'ROLE_ASSIGNED',
  ROLE_APPLICATION_APPROVED: 'ROLE_APPLICATION_APPROVED',
  ROLE_APPLICATION_REJECTED: 'ROLE_APPLICATION_REJECTED',
  REJECTION_HISTORY_VIEWED: 'REJECTION_HISTORY_VIEWED',
   SESSIONS_VIEWED: 'SESSIONS_VIEWED',
    ALL_OTHER_SESSIONS_REVOKED: 'ALL_OTHER_SESSIONS_REVOKED',
    SESSION_REVOKED: 'SESSION_REVOKED',
     ROLE_APPLICATION_SUBMITTED: 'ROLE_APPLICATION_SUBMITTED',
  ROLE_APPLICATION_STATUS_VIEWED: 'ROLE_APPLICATION_STATUS_VIEWED',

  // Password Security Events
  PASSWORD_CHANGE_REQUESTED: 'PASSWORD_CHANGE_REQUESTED',
  PASSWORD_CHANGE_FAILED: 'PASSWORD_CHANGE_FAILED',
   PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_CHANGE_OTP_SENT: 'PASSWORD_CHANGE_OTP_SENT',
  PASSWORD_CHANGE_OTP_VERIFIED: 'PASSWORD_CHANGE_OTP_VERIFIED',
  PASSWORD_CHANGE_OTP_FAILED: 'PASSWORD_CHANGE_OTP_FAILED',
  PASSWORD_CHANGED_SUCCESSFULLY: 'PASSWORD_CHANGED_SUCCESSFULLY',
  PASSWORD_CHANGE_FAILED_CURRENT_PASSWORD: 'PASSWORD_CHANGE_FAILED_CURRENT_PASSWORD',
  
  // Login Security Events
  LOGIN_ATTEMPT: 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_LOCKOUT: 'LOGIN_LOCKOUT',
   LOGOUT: 'LOGOUT',
  
  // Session Security Events
  SESSION_EXPIRED_INACTIVITY: 'SESSION_EXPIRED_INACTIVITY',
  SESSION_REVOKED: 'SESSION_REVOKED',
  ALL_OTHER_SESSIONS_REVOKED: 'ALL_OTHER_SESSIONS_REVOKED',
  
  // Account Security Events
  EMAIL_VERIFIED: 'EMAIL_VERIFIED',
  EMAIL_CHANGE_REQUESTED: 'EMAIL_CHANGE_REQUESTED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
   USER_REGISTERED: 'USER_REGISTERED',
  ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED'
};