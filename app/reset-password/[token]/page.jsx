'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function ResetPasswordPage({ params }) {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Unwrap params (Next.js 15 requirement)
  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params;
      setToken(resolvedParams.token);
      setIsLoading(false);
    };
    unwrapParams();
  }, [params]);

  // Password validation function (same as registration)
  const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    if (newPassword) {
      const validation = validatePassword(newPassword);
      if (!validation.isValid) {
        setPasswordError(validation.errors[0]);
      } else {
        setPasswordError('');
      }
    } else {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const validation = validatePassword(password);
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
        toast.success(data.message || 'Password reset successful!');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        toast.error(data.error || 'Unable to reset password');
        setLoading(false);
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="spinner"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <div className="max-w-md w-full text-center">
          <div className="bg-success/10 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Password Reset!</h2>
          <p className="text-muted mb-6">
            Your password has been successfully reset. Redirecting to login...
          </p>
          <Link href="/login" className="text-primary hover:text-primary-hover text-sm flex items-center justify-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

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
          <h2 className="mt-4 text-3xl font-bold text-foreground">Create New Password</h2>
          <p className="text-muted mt-2">
            Please enter your new password below.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={handlePasswordChange}
                className={`input-field pl-10 pr-10 ${passwordError ? 'border-error' : ''}`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="h-5 w-5 text-muted" /> : <Eye className="h-5 w-5 text-muted" />}
              </button>
            </div>
            {passwordError && (
              <div className="mt-1 flex items-center gap-1 text-xs text-error">
                <AlertCircle className="h-3 w-3" />
                <span>{passwordError}</span>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field pl-10 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5 text-muted" /> : <Eye className="h-5 w-5 text-muted" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <div className="mt-1 flex items-center gap-1 text-xs text-error">
                <AlertCircle className="h-3 w-3" />
                <span>Passwords do not match</span>
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted -mt-4">
            Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character.
          </p>

          <button
            type="submit"
            disabled={loading || !!passwordError || !password || !confirmPassword}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <div className="spinner"></div> : <Lock className="h-5 w-5" />}
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
          
          <div className="text-center">
            <Link href="/login" className="text-primary hover:text-primary-hover text-sm flex items-center justify-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}