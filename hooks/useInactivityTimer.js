// Client-side Inactivity Timer Hook
// Tracks user activity and triggers logout after 1 minute of inactivity

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function useInactivityTimer(timeoutMinutes = 1) {
  const router = useRouter();
  
  const resetTimer = useCallback(() => {
    // Update the last activity cookie via API
    fetch('/api/user/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(console.error);
  }, []);
  
  useEffect(() => {
    let inactivityTimer;
    
    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      
      inactivityTimer = setTimeout(async () => {
        // Show warning toast
        toast.error('Session expired due to inactivity. Please login again.', {
          duration: 5000,
          position: 'top-center'
        });
        
        // Call logout API
        await fetch('/api/auth/logout', { method: 'POST' });
        
        // Redirect to login
        router.push('/login');
      }, timeoutMinutes * 60 * 1000);
      
      // Reset server-side timer via API
      resetTimer();
    };
    
    // Events that indicate user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });
    
    // Initialize timer
    resetInactivityTimer();
    
    // Cleanup
    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      events.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [router, resetTimer, timeoutMinutes]);
}