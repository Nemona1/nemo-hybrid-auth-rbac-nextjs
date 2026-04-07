// Hybrid RBAC + PBAC Permission System
// Implements: User -> Role -> Permissions (Indirect) + Direct Permissions (Override)
// Priority: Direct Deny > Direct Grant > Role Permissions

import { prisma } from '@/lib/prisma';

/**
 * Check if user has specific permission
 * Priority: Direct Deny > Direct Grant > Role Permissions
 */
export async function hasPermission(userId, requiredPermission) {
  // Fetch user with role and permissions
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      },
      directPermissions: {
        include: { permission: true }
      }
    }
  });
  
  if (!user) return false;
  
  // Check direct permissions first (PBAC override)
  const directPermission = user.directPermissions.find(
    dp => dp.permission.name === requiredPermission
  );
  
  // Direct Deny takes highest precedence
  if (directPermission && !directPermission.isGranted) {
    return false;
  }
  
  // Direct Grant overrides role permissions
  if (directPermission && directPermission.isGranted) {
    return true;
  }
  
  // Fall back to role-based permissions (RBAC)
  if (user.role) {
    return user.role.permissions.some(
      rp => rp.permission.name === requiredPermission
    );
  }
  
  return false;
}

/**
 * Get all permissions for a user (resolved with overrides)
 */
export async function getUserPermissions(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      },
      directPermissions: {
        include: { permission: true }
      }
    }
  });
  
  if (!user) return [];
  
  // Start with role permissions
  const rolePermissions = user.role?.permissions.map(rp => rp.permission.name) || [];
  
  // Apply direct overrides
  const directGrants = user.directPermissions
    .filter(dp => dp.isGranted)
    .map(dp => dp.permission.name);
    
  const directDenies = user.directPermissions
    .filter(dp => !dp.isGranted)
    .map(dp => dp.permission.name);
  
  // Merge: role permissions + direct grants - direct denies
  const permissions = [...new Set([...rolePermissions, ...directGrants])];
  const finalPermissions = permissions.filter(p => !directDenies.includes(p));
  
  return finalPermissions;
}

/**
 * Middleware helper for route protection
 */
export function requirePermission(permission) {
  return async (req, user) => {
    const hasPerm = await hasPermission(user.id, permission);
    if (!hasPerm) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return null; // Continue
  };
}