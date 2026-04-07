'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectTest() {
  const router = useRouter();
  
  useEffect(() => {
    console.log('Redirect test page loaded');
    console.log('accessToken:', localStorage.getItem('accessToken'));
    
    // Test if we can access dashboard
    fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
    })
    .then(res => res.json())
    .then(data => console.log('Auth check:', data))
    .catch(err => console.error('Error:', err));
  }, []);
  
  return (
    <div className="p-8">
      <h1>Redirect Test Page</h1>
      <button 
        onClick={() => window.location.href = '/dashboard'}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Go to Dashboard
      </button>
      <button 
        onClick={() => window.location.href = '/login'}
        className="px-4 py-2 bg-gray-600 text-white rounded ml-2"
      >
        Go to Login
      </button>
    </div>
  );
}