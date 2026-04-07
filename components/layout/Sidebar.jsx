'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  Key, 
  FileText,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/users', icon: Users, label: 'Users', adminOnly: true },
  { path: '/admin/roles', icon: Shield, label: 'Roles', adminOnly: true },
  { path: '/admin/permissions', icon: Key, label: 'Permissions', adminOnly: true },
  { path: '/content', icon: FileText, label: 'Content' },
  { path: '/settings', icon: SettingsIcon, label: 'Settings' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

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
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-white" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-white" />
        )}
      </button>

      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <TooltipWrapper 
            key={item.path} 
            content={collapsed ? item.label : ''} 
            side="right"
          >
            <button
              onClick={() => router.push(item.path)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${pathname === item.path 
                  ? 'bg-primary/10 text-primary border-r-4 border-primary' 
                  : 'text-muted hover:text-primary hover:bg-primary/10'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </button>
          </TooltipWrapper>
        ))}
      </nav>
    </aside>
  );
}