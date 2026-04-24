'use client';

import { useEffect, useState } from 'react';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Check local storage for theme preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (prefersDark) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Logout user on tab close / page unload using sendBeacon (best-effort)
  useEffect(() => {
    const logoutUrl = '/api/auth/logout';

    const doLogout = () => {
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(logoutUrl);
        } else {
          // keepalive fetch as a fallback
          fetch(logoutUrl, { method: 'POST', credentials: 'include', keepalive: true });
        }
      } catch (err) {
        // best-effort, ignore errors
      }
    };

    const handleBeforeUnload = () => doLogout();
    const handlePageHide = (e) => {
      if (!e.persisted) doLogout();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <>
      {children}
      {/* Theme toggle button - you can place this anywhere */}
      <button
        onClick={toggleTheme}
        className="fixed bottom-4 right-4 p-3 bg-card border border-border rounded-full shadow-lg hover:scale-110 transition-all duration-200 z-50"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </>
  );
}