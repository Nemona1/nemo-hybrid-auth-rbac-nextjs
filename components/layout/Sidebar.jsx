'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';
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
  AlertCircle,
  LogOut,
  Globe
} from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { getSidebarItems } from '@/lib/sidebar-config';
import toast from 'react-hot-toast';

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
  AlertCircle,
  Globe
};

export default function Sidebar() {
  const { collapsed, toggleSidebar } = useSidebar();
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

  const handleLogout = async () => {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  };

  const getIconComponent = (iconName) => {
    return IconComponents[iconName] || LayoutDashboard;
  };

  if (loading) {
    return (
      <aside className={`fixed left-0 top-0 h-screen bg-card border-r border-border transition-all duration-300 z-40 ${collapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex items-center justify-center h-full">
          <div className="spinner"></div>
        </div>
      </aside>
    );
  }

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-card border-r border-border transition-all duration-300 z-40 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo Section */}
      <div className={`h-16 flex items-center ${collapsed ? 'justify-center' : 'px-6'} border-b border-border flex-shrink-0`}>
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <span className="text-lg font-bold text-foreground">Nemo Auth</span>
          </div>
        ) : (
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-lg">N</span>
          </div>
        )}
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 p-1 bg-primary rounded-full shadow-lg hover:scale-110 transition-all duration-200 z-50"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-white" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-white" />
        )}
      </button>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
        <div className="space-y-1">
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
                      ? 'bg-primary/10 text-primary border-r-2 border-primary' 
                      : 'text-muted hover:text-primary hover:bg-primary/5'
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
        </div>
      </nav>
      
      {/* Bottom Section */}
      <div className="border-t border-border flex-shrink-0">
        {!collapsed && userRole && (
          <div className="p-4 border-b border-border">
            <div className="text-xs text-muted">
              <p className="font-medium text-foreground">Logged in as</p>
              <p className="text-primary font-semibold">{userRole}</p>
            </div>
          </div>
        )}
        
        <TooltipWrapper content={collapsed ? 'Logout' : ''} side="right">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-muted hover:text-error hover:bg-error/10 ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </TooltipWrapper>
      </div>
    </aside>
  );
}