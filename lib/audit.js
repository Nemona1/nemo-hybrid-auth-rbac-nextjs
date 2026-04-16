import { prisma } from '@/lib/prisma';

/**
 * Create an audit log for general user actions (non-security critical)
 */
export async function createAuditLog({
  userId,
  action,
  resourceType,
  resourceId,
  details,
  ipAddress,
  userAgent
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        details: details || {},
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown'
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Get audit logs with filters
 */
export async function getAuditLogs({
  userId,
  action,
  resourceType,
  limit = 100,
  offset = 0,
  fromDate,
  toDate
}) {
  const where = {};
  
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (resourceType) where.resourceType = resourceType;
  if (fromDate || toDate) {
    where.timestamp = {};
    if (fromDate) where.timestamp.gte = new Date(fromDate);
    if (toDate) where.timestamp.lte = new Date(toDate);
  }
  
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
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
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.auditLog.count({ where })
  ]);
  
  return { logs, total };
}

/**
 * Audit Actions for general user actions
 */
export const AuditActions = {
  // Profile Actions
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  PROFILE_UPDATED_EMAIL_CHANGED: 'PROFILE_UPDATED_EMAIL_CHANGED',
  
  // Role & Permission Actions
  ROLE_CREATED: 'ROLE_CREATED',
  ROLE_UPDATED: 'ROLE_UPDATED',
  ROLE_DELETED: 'ROLE_DELETED',
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',
  ROLE_REMOVED: 'ROLE_REMOVED',
  PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  PERMISSION_REVOKED: 'PERMISSION_REVOKED',
  PERMISSION_REMOVED: 'PERMISSION_REMOVED',
  
  // Role Application Actions
  ROLE_APPLICATION_SUBMITTED: 'ROLE_APPLICATION_SUBMITTED',
  ROLE_APPLICATION_APPROVED: 'ROLE_APPLICATION_APPROVED',
  ROLE_APPLICATION_REJECTED: 'ROLE_APPLICATION_REJECTED',
  
  // User Management Actions
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  
  // Content Actions
  CONTENT_CREATED: 'CONTENT_CREATED',
  CONTENT_UPDATED: 'CONTENT_UPDATED',
  CONTENT_DELETED: 'CONTENT_DELETED',
  CONTENT_PUBLISHED: 'CONTENT_PUBLISHED',
  
  // 2FA Audit Actions
  '2FA_SETUP_INITIATED': '2FA_SETUP_INITIATED',
  '2FA_ENABLED': '2FA_ENABLED',
  '2FA_DISABLED': '2FA_DISABLED',
  '2FA_VERIFICATION_FAILED': '2FA_VERIFICATION_FAILED',
  '2FA_VERIFICATION_SUCCESS': '2FA_VERIFICATION_SUCCESS',
  
  // Login/Logout Audit Actions
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  PASSWORD_CHANGE_FAILED: 'PASSWORD_CHANGE_FAILED',
   PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  LOGOUT: 'LOGOUT',
   USER_REGISTERED: 'USER_REGISTERED',
  EMAIL_VERIFIED: 'EMAIL_VERIFIED',
  REJECTION_HISTORY_VIEWED: 'REJECTION_HISTORY_VIEWED',
  SESSION_REVOKED: 'SESSION_REVOKED',

   SECURITY_LOG_ACCESS: 'SECURITY_LOG_ACCESS',
    AUDIT_EXPORT: 'AUDIT_EXPORT',
     AUDIT_LOG_ACCESS: 'AUDIT_LOG_ACCESS',
      SESSIONS_VIEWED: 'SESSIONS_VIEWED',
       ALL_OTHER_SESSIONS_REVOKED: 'ALL_OTHER_SESSIONS_REVOKED',

    EMAIL_VERIFICATION_RESENT: 'EMAIL_VERIFICATION_RESENT',
};