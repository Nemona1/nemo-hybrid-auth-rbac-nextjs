// Production-grade Anti-Tampering Hook
// Disables right-click, text selection, and DevTools shortcuts
// Only activates in production environment

import { useEffect } from 'react';

export function useAntiTamper() {
  useEffect(() => {
    // Only enable in production
    if (process.env.NODE_ENV !== 'production') return;
    
    // Disable right-click
    const disableRightClick = (e) => {
      e.preventDefault();
      return false;
    };
    
    // Disable text selection and copying
    const disableSelection = (e) => {
      e.preventDefault();
      return false;
    };
    
    // Disable keyboard shortcuts for DevTools
    const disableDevTools = (e) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
      if (e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
          (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
        return false;
      }
      
      // Disable view source
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
    };
    
    // Detect DevTools opening (heuristic)
    let devToolsOpen = false;
    const checkDevTools = () => {
      const threshold = 160; // Height threshold for DevTools detection
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        if (!devToolsOpen) {
          devToolsOpen = true;
          // Optional: Log or redirect
          console.warn('DevTools detected');
        }
      } else {
        devToolsOpen = false;
      }
    };
    
    // Apply event listeners
    document.addEventListener('contextmenu', disableRightClick);
    document.addEventListener('copy', disableSelection);
    document.addEventListener('cut', disableSelection);
    document.addEventListener('selectstart', disableSelection);
    document.addEventListener('keydown', disableDevTools);
    
    // Check for DevTools periodically
    const interval = setInterval(checkDevTools, 1000);
    
    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', disableRightClick);
      document.removeEventListener('copy', disableSelection);
      document.removeEventListener('cut', disableSelection);
      document.removeEventListener('selectstart', disableSelection);
      document.removeEventListener('keydown', disableDevTools);
      clearInterval(interval);
    };
  }, []);
}