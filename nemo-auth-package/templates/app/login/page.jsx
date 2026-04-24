'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn, Eye, EyeOff, Users, UserCog, FileText, Eye as EyeIcon, Clock, AlertCircle, Timer, Shield } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'nimonahirko@gmail.com', password: 'Nimo@9137l', icon: UserCog, color: 'bg-purple-600' },
  { role: 'Editor', email: 'editor@nemo-auth.com', password: 'Editor@123456', icon: FileText, color: 'bg-blue-600' },
  { role: 'Manager', email: 'manager@nemo-auth.com', password: 'Manager@123456', icon: Users, color: 'bg-green-600' },
  { role: 'Viewer', email: 'viewer@nemo-auth.com', password: 'Viewer@123456', icon: EyeIcon, color: 'bg-gray-600' },
  { role: 'Pending', email: 'nimona2024hirko@gmail.com', password: 'Nimo@1234', icon: Clock, color: 'bg-yellow-600' },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState({
    isLocked: false,
    remainingSeconds: 0,
    remainingAttempts: null
  });
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Live countdown timer for lockout
  useEffect(() => {
    let interval;
    if (lockoutInfo.isLocked && lockoutInfo.remainingSeconds > 0) {
      interval = setInterval(() => {
        setLockoutInfo(prev => ({
          ...prev,
          remainingSeconds: prev.remainingSeconds - 1
        }));
      }, 1000);
    } else if (lockoutInfo.isLocked && lockoutInfo.remainingSeconds <= 0) {
      setLockoutInfo({
        isLocked: false,
        remainingSeconds: 0,
        remainingAttempts: null
      });
    }
    return () => clearInterval(interval);
  }, [lockoutInfo.isLocked, lockoutInfo.remainingSeconds]);

  // Handle URL parameters (verification success, errors, session expired)
  useEffect(() => {
    const verified = searchParams.get('verified');
    if (verified === 'true') {
      toast.success('Email verified successfully! You can now log in.', {
        duration: 5000,
        position: 'top-center',
        icon: '✅'
      });
      const url = new URL(window.location.href);
      url.searchParams.delete('verified');
      window.history.replaceState({}, '', url);
    }
    
    const error = searchParams.get('error');
    if (error === 'invalid_verification_token') {
      toast.error('Invalid verification link. Please register again.', {
        duration: 5000,
        position: 'top-center'
      });
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url);
    }
    
    // Handle session expired due to inactivity
    const expired = searchParams.get('expired');
    if (expired === 'true') {
      toast.error('Your session expired due to inactivity. Please login again.', {
        duration: 6000,
        position: 'top-center',
        icon: '⏰'
      });
      const url = new URL(window.location.href);
      url.searchParams.delete('expired');
      window.history.replaceState({}, '', url);
    }
    
    // Handle account locked
    const locked = searchParams.get('locked');
    if (locked === 'true') {
      toast.error('Your account has been temporarily locked due to multiple failed attempts. Please try again later.', {
        duration: 6000,
        position: 'top-center',
        icon: '🔒'
      });
      const url = new URL(window.location.href);
      url.searchParams.delete('locked');
      window.history.replaceState({}, '', url);
    }
    
    // Handle email verification required after email change
    const emailVerificationRequired = searchParams.get('email_verification_required');
    if (emailVerificationRequired === 'true') {
      toast('📧 Please verify your new email address before logging in. Check your inbox for the verification link.', {
        duration: 8000,
        position: 'top-center'
      });
      const url = new URL(window.location.href);
      url.searchParams.delete('email_verification_required');
      window.history.replaceState({}, '', url);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (lockoutInfo.isLocked) {
      toast.error(`Please wait ${lockoutInfo.remainingSeconds} seconds before trying again`);
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      const data = await res.json();

      // Handle 2FA required response
      if (data.requiresTwoFactor) {
        // FIXED: Use toast instead of toast.info
        toast(data.message || 'Verification code sent to your email', {
          duration: 5000,
          position: 'top-center',
          icon: '🔐'
        });
        // Store temp session info and redirect to 2FA verification page
        sessionStorage.setItem('temp2faEmail', formData.email);
        router.push('/verify-2fa');
        return;
      }

      if (res.ok && data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        
        toast.success('Login successful! Redirecting...', {
          duration: 2000,
          position: 'top-center',
          icon: '🎉'
        });
        window.location.href = data.redirectUrl || '/dashboard';
      } else {
        if (data.locked) {
          setLockoutInfo({
            isLocked: true,
            remainingSeconds: data.lockoutTime,
            remainingAttempts: 0
          });
          toast.error(data.error);
        } else if (data.remainingAttempts !== undefined) {
          setLockoutInfo({
            isLocked: false,
            remainingSeconds: 0,
            remainingAttempts: data.remainingAttempts
          });
          toast.error(data.error);
          if (data.remainingAttempts === 1) {
            toast.warning('Warning: Last attempt before account lockout!', {
              duration: 4000,
              position: 'top-center',
              icon: '⚠️'
            });
          }
        } else if (data.error === 'Please verify your email before logging in') {
          toast.error(data.error, {
            duration: 5000,
            position: 'top-center',
            icon: '📧'
          });
          setLoading(false);
        } else {
          toast.error(data.error || 'Login failed');
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Network error. Please try again.');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (lockoutInfo.remainingAttempts) {
      setLockoutInfo(prev => ({
        ...prev,
        remainingAttempts: null
      }));
    }
  };

  const fillDemoAccount = (email, password) => {
    setFormData({ email, password });
    toast.success(`Demo account loaded: ${email.split('@')[0]}`, {
      duration: 2000,
      position: 'top-center',
      icon: '🚀'
    });
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
        
        {/* Lockout Alert Banner */}
        {lockoutInfo.isLocked && (
          <div className="mb-6 bg-error/10 border-2 border-error/30 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-error" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-error">Account Temporarily Locked</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Timer className="h-4 w-4 text-error" />
                  <p className="text-sm text-error">
                    Wait <span className="font-bold text-lg">{lockoutInfo.remainingSeconds}</span> seconds
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Remaining Attempts Warning */}
        {!lockoutInfo.isLocked && lockoutInfo.remainingAttempts !== null && lockoutInfo.remainingAttempts > 0 && (
          <div className="mb-6 bg-warning/10 border-2 border-warning/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-warning" />
              <div className="flex-1">
                <p className="text-sm text-warning">
                  <span className="font-bold text-lg">{lockoutInfo.remainingAttempts}</span> attempt{lockoutInfo.remainingAttempts !== 1 ? 's' : ''} remaining
                </p>
                <p className="text-xs text-warning/80 mt-1">
                  ⚠️ 3 failed attempts = 30-second account lockout
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* 2FA Info Banner */}
        <div className="mb-6 bg-primary/5 border border-primary/20 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted">
              🔐 This account has Two-Factor Authentication enabled. You'll receive a verification code after entering your password.
            </p>
          </div>
        </div>
        
        {/* Demo Accounts Section */}
        <div className="mb-8">
          <p className="text-sm text-muted text-center mb-3">Quick Demo Access</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {DEMO_ACCOUNTS.map((account) => {
              const Icon = account.icon;
              return (
                <button
                  key={account.role}
                  onClick={() => fillDemoAccount(account.email, account.password)}
                  disabled={lockoutInfo.isLocked}
                  className={`group relative p-3 rounded-lg border border-border hover:border-primary transition-all duration-200 bg-card hover:scale-105 ${
                    lockoutInfo.isLocked ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div className={`h-8 w-8 ${account.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xs font-medium text-foreground">{account.role}</p>
                </button>
              );
            })}
          </div>
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
                name="email"
                required
                disabled={lockoutInfo.isLocked}
                value={formData.email}
                onChange={handleInputChange}
                className={`input-field pl-10 ${lockoutInfo.isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                name="password"
                required
                disabled={lockoutInfo.isLocked}
                value={formData.password}
                onChange={handleInputChange}
                className={`input-field pl-10 pr-10 ${lockoutInfo.isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                disabled={lockoutInfo.isLocked}
              >
                {showPassword ? <EyeOff className="h-5 w-5 text-muted" /> : <Eye className="h-5 w-5 text-muted" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || lockoutInfo.isLocked}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="spinner"></div>
            ) : lockoutInfo.isLocked ? (
              <>
                <Timer className="h-5 w-5" />
                Wait {lockoutInfo.remainingSeconds}s
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                Sign In
              </>
            )}
          </button>
          
          <div className="flex justify-between items-center">
            <Link href="/register" className="text-sm text-primary hover:text-primary-hover">
              Create account
            </Link>
            <Link href="/forgot-password" className="text-sm text-primary hover:text-primary-hover">
              Forgot Password?
            </Link>
          </div>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-muted">🔒 Enterprise-grade security | 3 failed attempts = 30s lockout</p>
          <p className="text-xs text-muted mt-1">⏰ Session expires after 1 minute of inactivity</p>
        </div>
      </div>
    </div>
  );
}