'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import RoleManager from '@/components/admin/RoleManager';
import { useAntiTamper } from '@/hooks/useAntiTamper';
import toast from 'react-hot-toast';
import { Shield, RefreshCw } from 'lucide-react';

export default function AdminRolesPage() {
  const router = useRouter();
  useAntiTamper();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/admin/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles);
        setPermissions(data.permissions);
      } else if (res.status === 403) {
        toast.error('Access denied. Admin privileges required.');
        router.push('/dashboard');
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (roleData) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roleData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'Role created successfully');
        fetchRolesAndPermissions();
      } else {
        toast.error(data.error || 'Failed to create role');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const handleUpdateRole = async (roleData) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roleData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'Role updated successfully');
        fetchRolesAndPermissions();
      } else {
        toast.error(data.error || 'Failed to update role');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Are you sure you want to delete this role? This action cannot be undone.')) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/admin/roles?id=${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'Role deleted successfully');
        fetchRolesAndPermissions();
      } else {
        toast.error(data.error || 'Failed to delete role');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Role Management</h1>
                <p className="text-muted mt-2">Create and manage system roles and permissions</p>
              </div>
              <button
                onClick={fetchRolesAndPermissions}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
          
          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <p className="text-xs text-muted">Total Roles</p>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{roles.length}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted">System Roles</p>
              <p className="text-2xl font-bold text-foreground mt-1">{roles.filter(r => r.isSystem).length}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted">Custom Roles</p>
              <p className="text-2xl font-bold text-foreground mt-1">{roles.filter(r => !r.isSystem).length}</p>
            </div>
          </div>
          
          <RoleManager
            roles={roles}
            permissions={permissions}
            onCreateRole={handleCreateRole}
            onUpdateRole={handleUpdateRole}
            onDeleteRole={handleDeleteRole}
          />
        </main>
      </div>
    </div>
  );
}