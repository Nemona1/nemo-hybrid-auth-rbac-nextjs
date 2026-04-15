'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import ProfileInfo from '@/components/profile/ProfileInfo';
import SecuritySettings from '@/components/profile/SecuritySettings';
import ActiveSessions from '@/components/profile/ActiveSessions';
import { useSidebar } from '@/context/SidebarContext';
import { useAntiTamper } from '@/hooks/useAntiTamper';
import { User, Shield, Smartphone } from 'lucide-react';

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
    { id: 'profile', label: 'Profile Information', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'sessions', label: 'Active Sessions', icon: Smartphone },
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
                      flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all
                      ${isActive 
                        ? 'text-primary border-b-2 border-primary bg-primary/5' 
                        : 'text-muted hover:text-foreground hover:bg-muted/5'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'profile' && (
            <ProfileInfo user={user} onUpdate={handleUserUpdate} loading={loading} />
          )}
          
          {activeTab === 'security' && (
            <SecuritySettings user={user} />
          )}
          
          {activeTab === 'sessions' && (
            <ActiveSessions />
          )}
        </main>
      </div>
    </div>
  );
}