'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    const redirectToRoleDashboard = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
          router.push('/login');
          return;
        }
        
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const user = await res.json();
          
          if (user.applicationStatus === 'APPROVED') {
            const roleName = user.role?.name;
            
            switch (roleName) {
              case 'ADMIN':
                router.replace('/dashboard/admin');
                break;
              case 'MANAGER':
                router.replace('/dashboard/manager');
                break;
              case 'EDITOR':
                router.replace('/dashboard/editor');
                break;
              case 'VIEWER':
                router.replace('/dashboard/viewer');
                break;
              default:
                router.replace('/role-request');
                break;
            }
          } else {
            router.replace('/role-request');
          }
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Redirect error:', error);
        router.push('/login');
      } finally {
        setIsRedirecting(false);
      }
    };
    
    redirectToRoleDashboard();
  }, [router]);

  if (isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="spinner"></div>
        <p className="ml-2 text-muted">Redirecting to your dashboard...</p>
      </div>
    );
  }
  
  return null;
}