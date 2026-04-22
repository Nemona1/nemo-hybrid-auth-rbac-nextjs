const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  // Create default permissions
  const permissions = await createPermissions();
  
  // Create system roles
  const roles = await createRoles(permissions);
  
  // Create users for each role
  await createUsers(roles);
  
  console.log('✅ Seeding completed!');
}

async function createPermissions() {
  const permissionList = [
    // User management
    { name: 'users:read', category: 'user', description: 'View user list and details' },
    { name: 'users:create', category: 'user', description: 'Create new users' },
    { name: 'users:update', category: 'user', description: 'Update user information' },
    { name: 'users:delete', category: 'user', description: 'Delete users' },
    
    // Role management
    { name: 'roles:read', category: 'admin', description: 'View roles' },
    { name: 'roles:create', category: 'admin', description: 'Create roles' },
    { name: 'roles:update', category: 'admin', description: 'Update roles' },
    { name: 'roles:delete', category: 'admin', description: 'Delete roles' },
    
    // Permission management
    { name: 'permissions:assign', category: 'admin', description: 'Assign permissions to roles' },
    { name: 'permissions:direct', category: 'admin', description: 'Grant direct user permissions' },
    
    // Content management
    { name: 'content:create', category: 'content', description: 'Create content' },
    { name: 'content:edit', category: 'content', description: 'Edit content' },
    { name: 'content:delete', category: 'content', description: 'Delete content' },
    { name: 'content:publish', category: 'content', description: 'Publish content' },
    { name: 'content:view', category: 'content', description: 'View content' },
    
    // System access
    { name: 'admin:access', category: 'system', description: 'Access admin panel' },
    { name: 'audit:read', category: 'system', description: 'View audit logs' },
  ];
  
  const created = {};
  for (const perm of permissionList) {
    const createdPerm = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm
    });
    created[perm.name] = createdPerm;
  }
  
  console.log(`📋 Created ${Object.keys(created).length} permissions`);
  return created;
}

async function createRoles(permissions) {
  const roles = {
    ADMIN: { name: 'ADMIN', description: 'System Administrator - Full access', isSystem: true },
    EDITOR: { name: 'EDITOR', description: 'Content Editor - Can create and edit content', isSystem: true },
    MANAGER: { name: 'MANAGER', description: 'Team Manager - Can approve content and manage team', isSystem: true },
    VIEWER: { name: 'VIEWER', description: 'Read-only access', isSystem: true }
  };
  
  const rolePermissions = {
    ADMIN: Object.values(permissions).map(p => p.id),
    EDITOR: [
      permissions['content:create'].id,
      permissions['content:edit'].id,
      permissions['content:view'].id
    ],
    MANAGER: [
      permissions['content:create'].id,
      permissions['content:edit'].id,
      permissions['content:delete'].id,
      permissions['content:publish'].id,
      permissions['content:view'].id,
      permissions['users:read'].id
    ],
    VIEWER: [
      permissions['content:view'].id
    ]
  };
  
  const created = {};
  for (const [key, roleData] of Object.entries(roles)) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: roleData
    });
    
    if (rolePermissions[key]) {
      for (const permId of rolePermissions[key]) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permId
            }
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permId,
            grantedBy: 'system'
          }
        });
      }
    }
    
    created[key] = role;
    console.log(`👤 Created role: ${roleData.name} with ${rolePermissions[key]?.length || 0} permissions`);
  }
  
  return created;
}

async function createUsers(roles) {
  const users = [
    {
      email: 'admin@nemo-auth.com',
      firstName: 'System',
      lastName: 'Administrator',
      password: 'Admin@123456',
      role: roles.ADMIN,
      isVerified: true,
      applicationStatus: 'APPROVED'
    },
    {
      email: 'editor@nemo-auth.com',
      firstName: 'Content',
      lastName: 'Editor',
      password: 'Editor@123456',
      role: roles.EDITOR,
      isVerified: true,
      applicationStatus: 'APPROVED'
    },
    {
      email: 'manager@nemo-auth.com',
      firstName: 'Team',
      lastName: 'Manager',
      password: 'Manager@123456',
      role: roles.MANAGER,
      isVerified: true,
      applicationStatus: 'APPROVED'
    },
    {
      email: 'viewer@nemo-auth.com',
      firstName: 'Read',
      lastName: 'Only',
      password: 'Viewer@123456',
      role: roles.VIEWER,
      isVerified: true,
      applicationStatus: 'APPROVED'
    },
    {
      email: 'pending@nemo-auth.com',
      firstName: 'Pending',
      lastName: 'User',
      password: 'Pending@123456',
      role: null,
      isVerified: true,
      applicationStatus: 'PENDING'
    }
  ];
  
  for (const userData of users) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash: hashedPassword,
        isVerified: userData.isVerified,
        applicationStatus: userData.applicationStatus,
        roleId: userData.role?.id
      }
    });
    
    console.log(`✅ Created user: ${userData.email} / ${userData.password} (${userData.role?.name || 'No Role'})`);
  }
  
  console.log('\n📋 Demo Accounts:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👑 ADMIN     : admin@nemo-auth.com / Admin@123456');
  console.log('✏️  EDITOR    : editor@nemo-auth.com / Editor@123456');
  console.log('📊 MANAGER   : manager@nemo-auth.com / Manager@123456');
  console.log('👁️  VIEWER    : viewer@nemo-auth.com / Viewer@123456');
  console.log('⏳ PENDING   : pending@nemo-auth.com / Pending@123456');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });