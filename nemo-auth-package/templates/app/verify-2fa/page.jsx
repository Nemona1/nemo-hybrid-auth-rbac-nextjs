'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Shield, Key, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function Verify2FAPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Get email from session storage
    const storedEmail = sessionStorage.getItem('temp2faEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      // No email found, redirect to login
      router.push('/login');
    }
  }, [router]);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const otpValue = otp.join('');
    
    if (!useBackupCode && otpValue.length !== 6) {
      setError('Please enter the 6-digit verification code');
      setLoading(false);
      return;
    }
    
    if (useBackupCode && (!backupCode || backupCode.length < 8)) {
      setError('Please enter a valid backup code (format: XXXX-XXXX)');
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp: useBackupCode ? undefined : otpValue,
          backupCode: useBackupCode ? backupCode.toUpperCase() : undefined,
          rememberDevice
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Store tokens
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        
        // Clear temp session
        sessionStorage.removeItem('temp2faEmail');
        
        toast.success('Verification successful! Redirecting...');
        
        // Use window.location.href for hard redirect
        window.location.href = data.redirectUrl || '/dashboard';
      } else {
        setError(data.error || 'Verification failed');
        toast.error(data.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError('Network error. Please try again.');
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/2fa/resend', { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        toast.success('New verification code sent to your email');
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(data.error || 'Failed to resend code');
        toast.error(data.error || 'Failed to resend code');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      toast.error('Network error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Handle paste event for OTP
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    if (pastedData && /^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
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
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-foreground">Two-Factor Authentication</h2>
          <p className="text-muted mt-2">
            {useBackupCode 
              ? 'Enter one of your backup codes'
              : `Enter the verification code sent to ${email}`
            }
          </p>
        </div>
        
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!useBackupCode ? (
              <div>
                <label className="block text-sm font-medium text-foreground mb-4 text-center">
                  Verification Code
                </label>
                <div className="flex justify-center gap-3" onPaste={handlePaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      className="w-12 h-12 text-center text-2xl font-mono border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-card"
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Backup Code
                </label>
                <input
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  className="input-field text-center font-mono"
                />
                <p className="text-xs text-muted mt-2 text-center">
                  Format: XXXX-XXXX (case insensitive)
                </p>
              </div>
            )}
            
            {error && (
              <div className="bg-error/10 border border-error/20 rounded-lg p-3">
                <p className="text-sm text-error text-center">{error}</p>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">Trust this device for 30 days</span>
              </label>
              
              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setError('');
                  setOtp(['', '', '', '', '', '']);
                  setBackupCode('');
                }}
                className="text-sm text-primary hover:underline"
              >
                {useBackupCode ? 'Use verification code instead' : 'Use backup code'}
              </button>
            </div>
            
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Verifying...
                </div>
              ) : (
                'Verify & Continue'
              )}
            </Button>
            
            {!useBackupCode && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={countdown > 0 || resending}
                  className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 mx-auto"
                >
                  {resending ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Sending...
                    </>
                  ) : countdown > 0 ? (
                    `Resend code in ${countdown}s`
                  ) : (
                    'Resend code'
                  )}
                </button>
              </div>
            )}
            
            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-sm text-muted hover:text-foreground flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Login
              </button>
            </div>
          </form>
        </Card>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-muted">
            🔒 Your account is protected with two-factor authentication
          </p>
        </div>
      </div>
    </div>
  );
}