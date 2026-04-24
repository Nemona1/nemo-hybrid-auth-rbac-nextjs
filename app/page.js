'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';

function HomeContent() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuthAndRedirect();
  }, [router]);

  const checkAuthAndRedirect = async () => {
    try {
      // First check if token exists in localStorage
      let token = localStorage.getItem('accessToken');
      
      // If no token, redirect to login immediately (no API call)
      if (!token) {
        router.push('/login');
        return;
      }
      
      // Only make API call if token exists
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const userData = await res.json();
        handleRoleRedirect(userData);
      } else {
        // Token invalid, clear storage and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
      }
    } catch (error) {
      router.push('/login');
    } finally {
      setIsChecking(false);
    }
  };
  
  const handleRoleRedirect = (user) => {
    if (user.applicationStatus === 'APPROVED') {
      const roleName = user.role?.name;
      
      switch (roleName) {
        case 'ADMIN':
          router.push('/dashboard/admin');
          break;
        case 'MANAGER':
          router.push('/dashboard/manager');
          break;
        case 'EDITOR':
          router.push('/dashboard/editor');
          break;
        case 'VIEWER':
          router.push('/dashboard/viewer');
          break;
        default:
          router.push('/role-request');
          break;
      }
    } else {
      router.push('/role-request');
    }
  };
  
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="spinner mx-auto"></div>
          <p className="mt-4 text-muted">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  return null;
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="spinner mx-auto"></div>
        <p className="mt-4 text-muted">Loading...</p>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}