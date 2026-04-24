'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import PermissionToggler from '@/components/admin/PermissionToggler';
import { useAntiTamper } from '@/hooks/useAntiTamper';
import { useSidebar } from '@/context/SidebarContext';
import toast from 'react-hot-toast';
import { Key, RefreshCw, Search } from 'lucide-react';

export default function AdminPermissionsPage() {
  const router = useRouter();
  const { collapsed } = useSidebar();
  useAntiTamper();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsersAndPermissions();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, users]);

  const fetchUsersAndPermissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const [usersRes, permsRes] = await Promise.all([
        fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/permissions', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (usersRes.ok && permsRes.ok) {
        const usersData = await usersRes.json();
        const permsData = await permsRes.json();
        setUsers(usersData);
        setFilteredUsers(usersData);
        setPermissions(permsData);
      } else if (usersRes.status === 403 || permsRes.status === 403) {
        toast.error('Access denied. Admin privileges required.');
        router.push('/dashboard');
      } else if (usersRes.status === 401 || permsRes.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchTerm) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  };

  const handleGrantPermission = async (userId, permissionId, isGranted, expiresAt) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, permissionId, isGranted, expiresAt })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || `Permission ${isGranted ? 'granted' : 'revoked'} successfully`);
        fetchUsersAndPermissions();
      } else {
        toast.error(data.error || 'Failed to update permission');
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
        {/* Main content with dynamic margin based on sidebar state */}
        <main className={`flex-1 p-8 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Permission Management</h1>
                <p className="text-muted mt-2">Grant or revoke direct permissions for users</p>
              </div>
              <button
                onClick={fetchUsersAndPermissions}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
          
          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <p className="text-xs text-muted">Total Permissions</p>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{permissions.length}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted">Total Users</p>
              <p className="text-2xl font-bold text-foreground mt-1">{users.length}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted">Permission Categories</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {[...new Set(permissions.map(p => p.category))].length}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted">Custom Overrides</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {users.reduce((acc, u) => acc + (u.directPermissions?.length || 0), 0)}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Select User</h2>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field pl-10"
                  />
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <p className="text-center text-muted py-8">No users found</p>
                  ) : (
                    filteredUsers.map((user) => (
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
                        {user.directPermissions?.length > 0 && (
                          <p className="text-xs text-primary mt-1">
                            {user.directPermissions.length} custom override{user.directPermissions.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </button>
                    ))
                  )}
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
                  <Key className="h-12 w-12 text-muted mx-auto mb-4" />
                  <p className="text-muted">Select a user to manage permissions</p>
                  <p className="text-xs text-muted/70 mt-2">Choose a user from the list to grant or revoke direct permissions</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}