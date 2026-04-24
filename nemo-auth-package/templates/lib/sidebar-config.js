// Sidebar configuration for different roles

export const SIDEBAR_CONFIG = {
  ADMIN: {
    menuItems: [
      { path: '/dashboard/admin', icon: 'LayoutDashboard', label: 'Dashboard', permission: 'admin:access' },
      { path: '/admin/users', icon: 'Users', label: 'User Management', permission: 'users:read' },
      { path: '/admin/roles', icon: 'Shield', label: 'Role Management', permission: 'roles:read' },
      { path: '/admin/permissions', icon: 'Key', label: 'Permissions', permission: 'permissions:assign' },
      { path: '/admin/audit', icon: 'FileText', label: 'Audit Logs', permission: 'audit:read' },
      
      // Removed: '/profile/sessions' - now in profile page tabs
    ]
  },
  
  MANAGER: {
    menuItems: [
      { path: '/dashboard/manager', icon: 'LayoutDashboard', label: 'Dashboard' },
      { path: '/team', icon: 'Users', label: 'Team Management' },
      { path: '/approvals', icon: 'CheckSquare', label: 'Pending Approvals' },
      { path: '/reports', icon: 'BarChart', label: 'Reports' },
      { path: '/projects', icon: 'Folder', label: 'Projects' },
      
      // Removed: '/profile/sessions'
    ]
  },
  
  EDITOR: {
    menuItems: [
      { path: '/dashboard/editor', icon: 'LayoutDashboard', label: 'Dashboard' },
      { path: '/content', icon: 'FileText', label: 'All Content' },
      { path: '/content/create', icon: 'PlusCircle', label: 'Create New' },
      { path: '/content/drafts', icon: 'Edit', label: 'My Drafts' },
      { path: '/content/published', icon: 'CheckCircle', label: 'Published' },
      
      // Removed: '/profile/sessions'
    ]
  },
  
  VIEWER: {
    menuItems: [
      { path: '/dashboard/viewer', icon: 'LayoutDashboard', label: 'Dashboard' },
      { path: '/content/view', icon: 'Eye', label: 'Browse Content' },
      { path: '/bookmarks', icon: 'Bookmark', label: 'Saved Items' },
      { path: '/notifications', icon: 'Bell', label: 'Notifications' },
      
      // Removed: '/profile/sessions'
    ]
  },
  
  PENDING: {
    menuItems: [
      { path: '/role-request', icon: 'Clock', label: 'Role Request Status' },
      
      // Removed: '/profile/sessions'
    ]
  }
};

// Helper function to get sidebar items based on user role
export function getSidebarItems(userRole, applicationStatus) {
  if (applicationStatus !== 'APPROVED') {
    return SIDEBAR_CONFIG.PENDING.menuItems;
  }
  
  switch (userRole) {
    case 'ADMIN':
      return SIDEBAR_CONFIG.ADMIN.menuItems;
    case 'MANAGER':
      return SIDEBAR_CONFIG.MANAGER.menuItems;
    case 'EDITOR':
      return SIDEBAR_CONFIG.EDITOR.menuItems;
    case 'VIEWER':
      return SIDEBAR_CONFIG.VIEWER.menuItems;
    default:
      return SIDEBAR_CONFIG.VIEWER.menuItems;
  }
}

export const ICON_MAP = {
  'LayoutDashboard': 'LayoutDashboard',
  'Users': 'Users',
  'Shield': 'Shield',
  'Key': 'Key',
  'FileText': 'FileText',
  'Settings': 'Settings',
  'User': 'User',
  'CheckSquare': 'CheckSquare',
  'BarChart': 'BarChart',
  'Folder': 'Folder',
  'PlusCircle': 'PlusCircle',
  'Edit': 'Edit',
  'CheckCircle': 'CheckCircle',
  'Eye': 'Eye',
  'Bookmark': 'Bookmark',
  'Bell': 'Bell',
  'Clock': 'Clock',
  'AlertCircle': 'AlertCircle',
  'Globe': 'Globe',
};