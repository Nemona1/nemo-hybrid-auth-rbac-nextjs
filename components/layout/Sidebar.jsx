'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  Key, 
  FileText,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  User,
  CheckSquare,
  BarChart,
  Folder,
  PlusCircle,
  Edit,
  CheckCircle,
  Eye,
  Bookmark,
  Bell,
  Clock,
  AlertCircle
} from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { getSidebarItems } from '@/lib/sidebar-config';

// Icon component mapping
const IconComponents = {
  LayoutDashboard,
  Users,
  Shield,
  Key,
  FileText,
  Settings: SettingsIcon,
  User,
  CheckSquare,
  BarChart,
  Folder,
  PlusCircle,
  Edit,
  CheckCircle,
  Eye,
  Bookmark,
  Bell,
  Clock,
  AlertCircle
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          router.push('/login');
          return;
        }
        
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const userData = await res.json();
          const role = userData.role?.name || null;
          const status = userData.applicationStatus;
          
          setUserRole(role);
          setApplicationStatus(status);
          
          // Get sidebar items based on role
          const items = getSidebarItems(role, status);
          setMenuItems(items);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserRole();
  }, [router]);

  // Helper to get icon component
  const getIconComponent = (iconName) => {
    return IconComponents[iconName] || LayoutDashboard;
  };

  if (loading) {
    return (
      <aside className={`bg-card border-r border-border min-h-screen transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex items-center justify-center h-full p-4">
          <div className="spinner"></div>
        </div>
      </aside>
    );
  }

  return (
    <aside 
      className={`bg-card border-r border-border min-h-screen transition-all duration-300 relative ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 p-1 bg-primary rounded-full shadow-lg hover:scale-110 transition-all duration-200 z-10"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-white" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-white" />
        )}
      </button>

      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const IconComponent = getIconComponent(item.icon);
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
          
          return (
            <TooltipWrapper 
              key={item.path} 
              content={collapsed ? item.label : ''} 
              side="right"
            >
              <button
                onClick={() => router.push(item.path)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-primary/10 text-primary border-r-4 border-primary' 
                    : 'text-muted hover:text-primary hover:bg-primary/10'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                <IconComponent className="h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </button>
            </TooltipWrapper>
          );
        })}
      </nav>
      
      {/* User info section at bottom of sidebar (optional) */}
      {!collapsed && userRole && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <div className="text-xs text-muted">
            <p className="font-medium text-foreground">Logged in as</p>
            <p className="text-primary font-semibold">{userRole}</p>
          </div>
        </div>
      )}
    </aside>
  );
}