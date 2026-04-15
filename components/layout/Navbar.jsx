'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, Settings, Bell, ChevronDown, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import ThemeToggle from '@/components/ui/ThemeToggle';
import toast from 'react-hot-toast';

export default function Navbar({ user }) {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    await fetch('/api/auth/logout', { 
      method: 'POST', 
      credentials: 'include' 
    });
    
    toast.success('Logged out successfully');
    window.location.href = '/login';
  };

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50 transition-all duration-200">
      <div className="px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">N</span>
          </div>
          <span className="text-xl font-bold text-foreground">Nemo Auth</span>
        </div>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          <button className="p-2 hover:bg-primary/10 rounded-full transition-colors relative">
            <Bell className="h-5 w-5 text-muted" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-accent rounded-full"></span>
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 p-2 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {user?.firstName} {user?.lastName}
              </span>
              <ChevronDown className="h-4 w-4 text-muted" />
            </button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-border py-2 z-50">
                {/* Profile Link */}
                <Link
                  href="/profile"
                  className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-primary/10 flex items-center gap-2 transition-colors"
                  onClick={() => setShowDropdown(false)}
                >
                  <UserCircle className="h-4 w-4 text-muted" />
                  My Profile
                </Link>
                
                {/* Settings Link - Only for Admins */}
                {user?.role?.name === 'ADMIN' && (
                  <Link
                    href="/admin/settings"
                    className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-primary/10 flex items-center gap-2 transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    <Settings className="h-4 w-4 text-muted" />
                    Admin Settings
                  </Link>
                )}
                
                <div className="border-t border-border my-1"></div>
                
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-error hover:bg-error/10 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}