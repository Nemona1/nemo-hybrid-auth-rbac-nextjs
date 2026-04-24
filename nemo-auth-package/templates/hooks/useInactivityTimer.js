import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function useInactivityTimer(timeoutMinutes = 1) {
  const router = useRouter();
  const timerRef = useRef(null);
  const isLoggedOutRef = useRef(false);

  const logout = useCallback(async () => {
    if (isLoggedOutRef.current) return;
    isLoggedOutRef.current = true;

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    toast.error('Session expired due to inactivity. Please login again.', {
      duration: 5000,
      position: 'top-center',
      icon: '⏰'
    });
    
    router.push('/login');
  }, [router]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    timerRef.current = setTimeout(() => {
      logout();
    }, timeoutMinutes * 60 * 1000);
    
    // Don't await or handle errors - fire and forget
    fetch('/api/user/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    }).catch(() => {
      // Silently fail - don't log errors
    });
  }, [logout, timeoutMinutes]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click'];
    
    const handleActivity = () => {
      resetTimer();
    };
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });
    
    resetTimer();
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer]);
}