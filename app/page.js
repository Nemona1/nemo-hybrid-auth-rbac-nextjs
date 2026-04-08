'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if this is a Google OAuth callback
    const code = searchParams.get('code');
    
    if (code) {
      // Handle Google OAuth callback
      console.log('[Home] Google OAuth callback detected');
      handleGoogleCallback(code);
      return;
    }
    
    // Normal auth check
    checkAuthAndRedirect();
  }, [router, searchParams]);

  const handleGoogleCallback = async (code) => {
    try {
      const res = await fetch(`/api/auth/google/callback?code=${code}`);
      if (res.ok) {
        const data = await res.json();
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        router.push('/dashboard');
      } else {
        router.push('/login?error=google_auth_failed');
      }
    } catch (error) {
      console.error('Google callback error:', error);
      router.push('/login?error=google_auth_failed');
    }
  };

  const checkAuthAndRedirect = async () => {
    try {
      // First try to get token from localStorage
      let token = localStorage.getItem('accessToken');
      
      // If not in localStorage, try to get from cookie (via API)
      if (!token) {
        try {
          const res = await fetch('/api/auth/me', { 
            method: 'GET', 
            credentials: 'include' 
          });
          if (res.ok) {
            const userData = await res.json();
            handleRoleRedirect(userData);
            return;
          }
        } catch (e) {
          console.error('Cookie auth failed:', e);
        }
      }
      
      // If no token at all, redirect to login
      if (!token) {
        router.push('/login');
        return;
      }
      
      // Verify token and get user data
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
      console.error('Auth check failed:', error);
      router.push('/login');
    } finally {
      setIsChecking(false);
    }
  };
  
  const handleRoleRedirect = (user) => {
    console.log('[Home] User data:', { 
      role: user.role?.name, 
      applicationStatus: user.applicationStatus 
    });
    
    // Check if user has approved role application
    if (user.applicationStatus === 'APPROVED') {
      // Redirect based on role
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
    } else if (user.applicationStatus === 'PENDING') {
      router.push('/role-request');
    } else if (user.applicationStatus === 'REJECTED') {
      router.push('/role-request');
    } else {
      router.push('/role-request');
    }
  };
  
  if (isChecking && !searchParams.get('code')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="spinner mx-auto"></div>
          <p className="mt-4 text-muted">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="spinner mx-auto"></div>
        <p className="mt-4 text-muted">Completing Google Sign-In...</p>
      </div>
    </div>
  );
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