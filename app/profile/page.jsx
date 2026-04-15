'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { useSidebar } from '@/context/SidebarContext';
import { useAntiTamper } from '@/hooks/useAntiTamper';
import { 
  User, 
  Shield, 
  Key, 
  Smartphone,
  Lock,
  Fingerprint
} from 'lucide-react';
import ProfileInfo from '@/components/profile/ProfileInfo';
import PasswordSettings from '@/components/profile/PasswordSettings';
import TwoFactorAuth from '@/components/profile/TwoFactorAuth';
import ActiveSessions from '@/components/profile/ActiveSessions';

export default function ProfilePage() {
  const router = useRouter();
  const { collapsed } = useSidebar();
  useAntiTamper();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('[Profile] User data fetched:', { 
          email: data.email, 
          twoFactorEnabled: data.twoFactorEnabled 
        });
        setUser(data);
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = () => {
    console.log('[Profile] Refreshing user data after update');
    fetchUserData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="spinner"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: User, description: 'Manage your personal information' },
    { id: 'password', label: 'Password', icon: Lock, description: 'Change your password' },
    { id: 'two-factor', label: 'Two-Factor Authentication', icon: Fingerprint, description: 'Add an extra layer of security' },
    { id: 'sessions', label: 'Active Sessions', icon: Smartphone, description: 'Manage your active devices' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 p-8 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <User className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            </div>
            <p className="text-muted">Manage your account information and security settings</p>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-border mb-6">
            <nav className="flex gap-1 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-all
                      ${isActive 
                        ? 'text-primary border-b-2 border-primary bg-primary/5' 
                        : 'text-muted hover:text-foreground hover:bg-muted/5'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'profile' && (
            <ProfileInfo user={user} onUpdate={handleUserUpdate} loading={loading} />
          )}
          
          {activeTab === 'password' && (
            <PasswordSettings user={user} />
          )}
          
          {activeTab === 'two-factor' && (
            <TwoFactorAuth user={user} onUpdate={handleUserUpdate} />
          )}
          
          {activeTab === 'sessions' && (
            <ActiveSessions />
          )}
        </main>
      </div>
    </div>
  );
}