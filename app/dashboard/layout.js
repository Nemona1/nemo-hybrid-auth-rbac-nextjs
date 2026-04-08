'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { useUserRole } from '@/hooks/useUserRole';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user, loading, userRole, applicationStatus } = useUserRole();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check if user has approved role
  if (applicationStatus !== 'APPROVED') {
    router.push('/role-request');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}