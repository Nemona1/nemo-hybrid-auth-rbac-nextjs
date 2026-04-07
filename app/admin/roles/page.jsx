'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import RoleManager from '@/components/admin/RoleManager';
import { useAntiTamper } from '@/hooks/useAntiTamper';
import toast from 'react-hot-toast';

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
    try {
      const res = await fetch('/api/admin/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles);
        setPermissions(data.permissions);
      } else if (res.status === 403) {
        toast.error('Access denied. Admin privileges required.');
        router.push('/dashboard');
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
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData)
      });
      
      if (res.ok) {
        toast.success('Role created successfully');
        fetchRolesAndPermissions();
      } else {
        toast.error('Failed to create role');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const handleUpdateRole = async (roleData) => {
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData)
      });
      
      if (res.ok) {
        toast.success('Role updated successfully');
        fetchRolesAndPermissions();
      } else {
        toast.error('Failed to update role');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    
    try {
      const res = await fetch(`/api/admin/roles?id=${roleId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        toast.success('Role deleted successfully');
        fetchRolesAndPermissions();
      } else {
        toast.error('Failed to delete role');
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
            <h1 className="text-3xl font-bold text-foreground">Role Management</h1>
            <p className="text-muted mt-2">Create and manage system roles and permissions</p>
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