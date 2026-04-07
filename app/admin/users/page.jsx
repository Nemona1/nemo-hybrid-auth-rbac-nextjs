'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import UserTable from '@/components/admin/UserTable';
import { useAntiTamper } from '@/hooks/useAntiTamper';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const router = useRouter();
  useAntiTamper();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else if (res.status === 403) {
        toast.error('Access denied. Admin privileges required.');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId, roleId) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roleId })
      });
      
      if (res.ok) {
        toast.success('User role updated successfully');
        fetchUsers();
      } else {
        toast.error('Failed to update user role');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const handleApplicationReview = async (applicationId, userId, status, reason) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          userId,
          applicationStatus: status,
          reviewReason: reason
        })
      });
      
      if (res.ok) {
        toast.success(`Application ${status.toLowerCase()} successfully`);
        fetchUsers();
      } else {
        toast.error('Failed to review application');
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
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted mt-2">Manage users, roles, and permissions</p>
          </div>
          
          <UserTable
            users={users}
            onRoleUpdate={handleRoleUpdate}
            onApplicationReview={handleApplicationReview}
          />
        </main>
      </div>
    </div>
  );
}