'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import PermissionToggler from '@/components/admin/PermissionToggler';
import { useAntiTamper } from '@/hooks/useAntiTamper';
import toast from 'react-hot-toast';

export default function AdminPermissionsPage() {
  const router = useRouter();
  useAntiTamper();
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsersAndPermissions();
  }, []);

  const fetchUsersAndPermissions = async () => {
    try {
      const [usersRes, permsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/permissions')
      ]);
      
      if (usersRes.ok && permsRes.ok) {
        const usersData = await usersRes.json();
        const permsData = await permsRes.json();
        setUsers(usersData);
        setPermissions(permsData);
      } else if (usersRes.status === 403 || permsRes.status === 403) {
        toast.error('Access denied. Admin privileges required.');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPermission = async (userId, permissionId, isGranted, expiresAt) => {
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, permissionId, isGranted, expiresAt })
      });
      
      if (res.ok) {
        toast.success(`Permission ${isGranted ? 'granted' : 'revoked'} successfully`);
        fetchUsersAndPermissions();
      } else {
        toast.error('Failed to update permission');
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
            <h1 className="text-3xl font-bold text-foreground">Permission Management</h1>
            <p className="text-muted mt-2">Grant or revoke direct permissions for users</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Select User</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                        selectedUser?.id === user.id
                          ? 'bg-primary/10 border-l-4 border-primary'
                          : 'bg-card border border-border hover:bg-primary/5'
                      }`}
                    >
                      <p className="font-medium text-foreground">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-muted">{user.email}</p>
                      <p className="text-xs text-muted mt-1">Role: {user.role?.name || 'None'}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-2">
              {selectedUser ? (
                <PermissionToggler
                  user={selectedUser}
                  permissions={permissions}
                  onGrantPermission={handleGrantPermission}
                />
              ) : (
                <div className="bg-card border border-border rounded-lg shadow-md p-12 text-center">
                  <p className="text-muted">Select a user to manage permissions</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}