'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    console.log('[LOGIN PAGE] Submitting login for:', formData.email);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include' // Important for cookies
      });

      const data = await res.json();
      console.log('[LOGIN PAGE] Response status:', res.status);
      console.log('[LOGIN PAGE] Has accessToken:', !!data.accessToken);

      if (res.ok && data.accessToken) {
        // Store in localStorage for client-side use
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        
        console.log('[LOGIN PAGE] Tokens saved, redirecting...');
        toast.success('Login successful! Redirecting...');
        
        // Force hard redirect
        window.location.href = '/dashboard';
      } else {
        console.log('[LOGIN PAGE] Login failed:', data.error);
        toast.error(data.error || 'Login failed');
        setLoading(false);
      }
    } catch (error) {
      console.error('[LOGIN PAGE] Error:', error);
      toast.error('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-primary rounded-full flex items-center justify-center mx-auto shadow-glow">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-foreground">Welcome Back</h2>
          <p className="text-muted mt-2">Sign in to your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field pl-10"
                placeholder="admin@nemo-auth.com"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input-field pl-10 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-muted" />
                ) : (
                  <Eye className="h-5 w-5 text-muted" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="spinner"></div>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                Sign In
              </>
            )}
          </button>
          
          <div className="text-center">
            <Link href="/register" className="text-primary hover:text-primary-hover text-sm">
              Don't have an account? Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}