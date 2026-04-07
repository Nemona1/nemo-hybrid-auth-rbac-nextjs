'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Users, FileText, CheckCircle, Clock, Activity, Shield } from 'lucide-react';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Get token from localStorage
      let token = localStorage.getItem('accessToken');
      
      // If not in localStorage, try to get from cookie (via API)
      if (!token) {
        try {
          const res = await fetch('/api/auth/me', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            setUser(data);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Cookie auth failed:', e);
        }
      }
      
      console.log('[DASHBOARD] Token exists:', !!token);
      
      if (!token) {
        console.log('[DASHBOARD] No token, redirecting to login');
        window.location.href = '/login';
        return;
      }
      
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('[DASHBOARD] Auth check response:', res.status);
        
        if (res.ok) {
          const userData = await res.json();
          console.log('[DASHBOARD] User loaded:', userData.email);
          setUser(userData);
        } else {
          console.log('[DASHBOARD] Invalid token, clearing');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('[DASHBOARD] Error:', error);
        window.location.href = '/login';
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="spinner"></div>
        <p className="ml-2 text-muted">Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted mt-2">Welcome back, {user.firstName}!</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Total Users</p>
                  <p className="text-2xl font-bold text-foreground">1,250</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Total Content</p>
                  <p className="text-2xl font-bold text-foreground">342</p>
                </div>
                <FileText className="h-8 w-8 text-success" />
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Pending Approvals</p>
                  <p className="text-2xl font-bold text-foreground">8</p>
                </div>
                <Clock className="h-8 w-8 text-warning" />
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Completed Tasks</p>
                  <p className="text-2xl font-bold text-foreground">156</p>
                </div>
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}