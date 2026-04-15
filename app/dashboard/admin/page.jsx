'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Users, Shield, Key, Activity, TrendingUp, Server, AlertTriangle, CheckCircle } from 'lucide-react';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';

export default function AdminDashboard() {
   useInactivityTimer(1); // 1 minute timeout for inactivity
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRoles: 0,
    totalPermissions: 0,
    pendingApplications: 0,
    activeSessions: 0,
    securityAlerts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const [usersRes, rolesRes, permissionsRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/roles', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/permissions', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const users = usersRes.ok ? await usersRes.json() : [];
      const roles = rolesRes.ok ? await rolesRes.json() : [];
      const permissions = permissionsRes.ok ? await permissionsRes.json() : [];

      setStats({
        totalUsers: users.length || 0,
        totalRoles: roles.roles?.length || 0,
        totalPermissions: permissions.length || 0,
        pendingApplications: users.filter(u => u.applicationStatus === 'PENDING').length || 0,
        activeSessions: 12,
        securityAlerts: 3
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted mt-2">System Overview & Analytics</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Total Users</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Roles</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalRoles}</p>
            </div>
            <Shield className="h-8 w-8 text-success" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Permissions</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalPermissions}</p>
            </div>
            <Key className="h-8 w-8 text-warning" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Pending Apps</p>
              <p className="text-2xl font-bold text-foreground">{stats.pendingApplications}</p>
            </div>
            <Activity className="h-8 w-8 text-error" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Active Sessions</p>
              <p className="text-2xl font-bold text-foreground">{stats.activeSessions}</p>
            </div>
            <Server className="h-8 w-8 text-primary" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Security Alerts</p>
              <p className="text-2xl font-bold text-foreground">{stats.securityAlerts}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-error" />
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-primary/10 rounded-lg hover:bg-primary/20 transition">
              <span className="font-medium">Manage Users</span>
              <p className="text-sm text-muted">Add, edit, or remove users</p>
            </button>
            <button className="w-full text-left p-3 bg-primary/10 rounded-lg hover:bg-primary/20 transition">
              <span className="font-medium">Role Management</span>
              <p className="text-sm text-muted">Configure roles and permissions</p>
            </button>
            <button className="w-full text-left p-3 bg-primary/10 rounded-lg hover:bg-primary/20 transition">
              <span className="font-medium">Audit Logs</span>
              <p className="text-sm text-muted">View system activity logs</p>
            </button>
          </div>
        </Card>
        
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">System Health</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">API Status</span>
              <span className="text-sm text-success flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Operational</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Database</span>
              <span className="text-sm text-success flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Connected</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Last Backup</span>
              <span className="text-sm text-foreground">2 hours ago</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Uptime</span>
              <span className="text-sm text-foreground">99.99%</span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}