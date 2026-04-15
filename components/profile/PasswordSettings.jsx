'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Key, Mail, RefreshCw, Eye, EyeOff, Lock, AlertCircle, Timer } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PasswordSettings({ user }) {
  const [step, setStep] = useState('request'); // 'request', 'verify', 'change'
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(null);

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push('Password must be at least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
    if (!/\d/.test(password)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    return { isValid: errors.length === 0, errors };
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    
    setSendingOtp(true);
    setPasswordError('');
    setRemainingAttempts(null);
    setLockoutSeconds(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/request-password-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStep('verify');
        toast.success(data.message);
      } else {
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
          toast.error(data.error);
        } else if (data.locked) {
          setLockoutSeconds(data.remainingSeconds);
          toast.error(data.error);
          // Start countdown timer
          const interval = setInterval(() => {
            setLockoutSeconds(prev => {
              if (prev <= 1) {
                clearInterval(interval);
                setLockoutSeconds(null);
                setRemainingAttempts(3);
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          toast.error(data.error || 'Failed to send verification code');
        }
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }
    
    setVerifyingOtp(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ otp: otpCode })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStep('change');
        toast.success('Code verified! Please enter your new password.');
      } else {
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
          toast.error(data.error);
        } else if (data.locked) {
          setLockoutSeconds(data.remainingSeconds);
          toast.error(data.error);
        } else {
          toast.error(data.error || 'Invalid verification code');
        }
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setPasswordError(validation.errors[0]);
      return;
    }
    
    setChangingPassword(true);
    setPasswordError('');
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/verify-otp-change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          otp: otpCode,
          newPassword
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message);
        
        setTimeout(async () => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
          window.location.href = '/login?password_changed=true';
        }, 2000);
      } else {
        toast.error(data.error || 'Failed to change password');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleResendOtp = async () => {
    setResendingOtp(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/request-password-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('New verification code sent to your email');
      } else {
        toast.error(data.error || 'Failed to resend code');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setResendingOtp(false);
    }
  };

  // Lockout warning display
  if (lockoutSeconds) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="bg-error/10 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
            <Timer className="h-8 w-8 text-error" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Account Temporarily Locked</h3>
          <p className="text-muted mb-4">
            Too many failed attempts. Please wait <strong>{lockoutSeconds}</strong> seconds before trying again.
          </p>
          <p className="text-sm text-muted">
            A security alert has been sent to your email.
          </p>
        </div>
      </Card>
    );
  }

  if (step === 'request') {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Change Password</h2>
        <p className="text-sm text-muted mb-4">
          Enter your current password to receive a verification code.
        </p>
        
        {remainingAttempts !== null && remainingAttempts > 0 && (
          <div className="mb-4 bg-warning/10 border border-warning/20 rounded-lg p-3">
            <p className="text-sm text-warning">
              ⚠️ {remainingAttempts} attempt(s) remaining before account lockout.
            </p>
          </div>
        )}
        
        <form onSubmit={handleRequestOtp} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-field pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4 text-muted" /> : <Eye className="h-4 w-4 text-muted" />}
              </button>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={sendingOtp} className="gap-2">
              {sendingOtp ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send Verification Code
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  if (step === 'verify') {
    return (
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground mb-2">Verify Your Identity</h2>
          <p className="text-sm text-muted">
            A verification code has been sent to <strong>{user?.email}</strong>. 
            It will expire in 10 minutes.
          </p>
        </div>
        
        {remainingAttempts !== null && remainingAttempts > 0 && (
          <div className="mb-4 bg-warning/10 border border-warning/20 rounded-lg p-3">
            <p className="text-sm text-warning">
              ⚠️ {remainingAttempts} attempt(s) remaining before account lockout.
            </p>
          </div>
        )}
        
        <form onSubmit={handleVerifyOtp} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Verification Code
            </label>
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="input-field text-center text-2xl tracking-widest font-mono"
              required
            />
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button 
              variant="secondary" 
              onClick={() => {
                setStep('request');
                setOtpCode('');
                setRemainingAttempts(null);
              }}
            >
              Back
            </Button>
            <Button type="submit" disabled={verifyingOtp} className="gap-2">
              {verifyingOtp ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
              Verify Code
            </Button>
          </div>
          
          <div className="text-center">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendingOtp}
              className="text-sm text-primary hover:underline"
            >
              {resendingOtp ? 'Sending...' : 'Resend Code'}
            </button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Set New Password</h2>
      
      <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            New Password
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showNewPassword ? <EyeOff className="h-4 w-4 text-muted" /> : <Eye className="h-4 w-4 text-muted" />}
            </button>
          </div>
          <p className="text-xs text-muted mt-1">
            Minimum 8 characters with uppercase, lowercase, number, and special character
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted" /> : <Eye className="h-4 w-4 text-muted" />}
            </button>
          </div>
        </div>
        
        {passwordError && (
          <div className="bg-error/10 border border-error/20 rounded-lg p-3">
            <p className="text-sm text-error">{passwordError}</p>
          </div>
        )}
        
        <div className="flex gap-3 justify-end">
          <Button 
            variant="secondary" 
            onClick={() => {
              setStep('verify');
              setNewPassword('');
              setConfirmPassword('');
            }}
          >
            Back
          </Button>
          <Button type="submit" disabled={changingPassword} className="gap-2">
            {changingPassword ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Change Password
          </Button>
        </div>
      </form>
    </Card>
  );
}