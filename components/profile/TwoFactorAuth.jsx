'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Shield, Key, CheckCircle, AlertCircle, Lock, Copy, Download, 
  RefreshCw, Smartphone, Mail, ShieldCheck, ShieldOff, 
  Info, ExternalLink, ShieldAlert, ChevronRight, X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TwoFactorAuth({ user, onUpdate }) {
  // Get initial state from user prop
  const [isEnabled, setIsEnabled] = useState(user?.twoFactorEnabled === true);
  const [isLoading, setIsLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('initial');
  const [refreshKey, setRefreshKey] = useState(0);

  // Log the initial state for debugging
  useEffect(() => {
    console.log('[2FA Component] User object:', user);
    console.log('[2FA Component] twoFactorEnabled value:', user?.twoFactorEnabled);
    console.log('[2FA Component] isEnabled state:', isEnabled);
  }, [user, isEnabled]);

  const handleToggle = () => {
    if (isEnabled) {
      setShowDisableConfirm(true);
    } else {
      startSetup();
    }
  };

  const startSetup = async () => {
    setIsLoading(true);
    setError('');
    setStep('setup');
    
    try {
      const token = localStorage.getItem('accessToken');
      console.log('[2FA] Starting setup with token:', !!token);
      
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      console.log('[2FA] Setup response:', data);
      
      if (res.ok) {
        setShowSetup(true);
        toast.success(data.message);
      } else {
        setError(data.error);
        toast.error(data.error);
        setStep('initial');
      }
    } catch (error) {
      console.error('[2FA] Setup error:', error);
      setError('Network error');
      toast.error('Network error');
      setStep('initial');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setStep('verify');
    
    try {
      const token = localStorage.getItem('accessToken');
      console.log('[2FA] Verifying OTP with token:', !!token);
      
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ otp: otpCode })
      });
      
      const data = await res.json();
      console.log('[2FA] Enable response:', data);
      
      if (res.ok) {
        setIsEnabled(true);
        setBackupCodes(data.backupCodes);
        setShowSetup(false);
        setShowVerify(false);
        setStep('backup-codes');
        toast.success(data.message);
        if (onUpdate) onUpdate();
      } else {
        setError(data.error);
        toast.error(data.error);
        setStep('setup');
      }
    } catch (error) {
      console.error('[2FA] Verify error:', error);
      setError('Network error');
      toast.error('Network error');
      setStep('setup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePassword) {
      setError('Please enter your password to disable 2FA');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('accessToken');
      console.log('[2FA] Disabling 2FA with token:', !!token);
      
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: disablePassword })
      });
      
      const data = await res.json();
      console.log('[2FA] Disable response:', data);
      
      if (res.ok) {
        setIsEnabled(false);
        setShowDisableConfirm(false);
        setDisablePassword('');
        toast.success(data.message);
        if (onUpdate) onUpdate();
        setRefreshKey(prev => prev + 1);
      } else {
        setError(data.error);
        toast.error(data.error);
      }
    } catch (error) {
      console.error('[2FA] Disable error:', error);
      setError('Network error');
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const copyBackupCodes = () => {
    if (backupCodes) {
      navigator.clipboard.writeText(backupCodes.join('\n'));
      toast.success('Backup codes copied to clipboard');
    }
  };

  const downloadBackupCodes = () => {
    if (backupCodes) {
      const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nemo-auth-backup-codes.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const resetSetup = () => {
    setShowSetup(false);
    setShowVerify(false);
    setStep('initial');
    setOtpCode('');
    setError('');
  };

  // Toggle Switch Component
  const ToggleSwitch = () => (
    <div className="flex items-center gap-3">
      <span className={`text-sm font-medium transition-colors duration-200 ${!isEnabled ? 'text-muted' : 'text-success'}`}>
        Off
      </span>
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300
          ${isEnabled ? 'bg-success' : 'bg-muted'}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
        `}
        aria-label={isEnabled ? 'Disable Two-Factor Authentication' : 'Enable Two-Factor Authentication'}
      >
        <span
          className={`
            inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 shadow-md
            ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
      <span className={`text-sm font-medium transition-colors duration-200 ${isEnabled ? 'text-muted' : 'text-primary'}`}>
        On
      </span>
    </div>
  );

  // Setup Step 1: Information
  if (step === 'setup' && showSetup && !showVerify) {
    return (
      <Card className="p-6 border-border">
        <div className="mb-6">
          <button 
            onClick={resetSetup}
            className="text-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="text-center mb-6">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Protect Your Account with 2FA</h3>
          <p className="text-muted mt-2 max-w-md mx-auto">
            Two-factor authentication adds an extra layer of security to your account.
          </p>
        </div>
        
        <div className="bg-muted/5 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Email-based Verification</p>
              <p className="text-xs text-muted mt-1">
                We'll send a 6-digit code to your email address each time you sign in.
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-muted/5 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Key className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Backup Codes</p>
              <p className="text-xs text-muted mt-1">
                You'll receive backup codes to use if you lose access to your email.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button variant="secondary" onClick={resetSetup} className="flex-1">
            Cancel
          </Button>
          <Button onClick={() => setShowVerify(true)} className="flex-1 gap-2">
            Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  // Setup Step 2: Verify OTP
  if (step === 'verify' && showVerify) {
    return (
      <Card className="p-6 border-border">
        <div className="mb-4">
          <button 
            onClick={() => {
              setShowVerify(false);
              setOtpCode('');
              setError('');
            }}
            className="text-muted hover:text-foreground transition-colors"
          >
            ← Back
          </button>
        </div>
        
        <div className="text-center mb-6">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Verify Your Email</h3>
          <p className="text-muted mt-2">
            Enter the 6-digit code sent to <strong>{user?.email}</strong>
          </p>
        </div>
        
        {error && (
          <div className="mb-4 bg-error/10 border border-error/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-error" />
              <p className="text-sm text-error">{error}</p>
            </div>
          </div>
        )}
        
        <div className="max-w-sm mx-auto">
          <div className="flex justify-center gap-3 mb-6">
            {[...Array(6)].map((_, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                value={otpCode[index] || ''}
                onChange={(e) => {
                  const newOtp = otpCode.split('');
                  newOtp[index] = e.target.value;
                  setOtpCode(newOtp.join(''));
                  if (e.target.value && index < 5) {
                    const nextInput = document.getElementById(`otp-${index + 1}`);
                    nextInput?.focus();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
                    const prevInput = document.getElementById(`otp-${index - 1}`);
                    prevInput?.focus();
                  }
                }}
                id={`otp-${index}`}
                className="w-12 h-14 text-center text-2xl font-mono font-bold border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-card"
                autoFocus={index === 0}
              />
            ))}
          </div>
          
          <Button onClick={handleVerifyOtp} disabled={isLoading} className="w-full gap-2">
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify & Enable
          </Button>
          
          <div className="text-center mt-4">
            <button
              onClick={startSetup}
              className="text-sm text-primary hover:underline"
            >
              Resend Code
            </button>
          </div>
        </div>
      </Card>
    );
  }

  // Step 3: Backup Codes
  if (step === 'backup-codes' && backupCodes) {
    return (
      <Card className="p-6 border-border">
        <div className="text-center mb-6">
          <div className="h-16 w-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">2FA Enabled Successfully!</h3>
          <p className="text-muted mt-2">
            Save these backup codes in a secure place. You'll need them if you lose access to your email.
          </p>
        </div>
        
        <div className="bg-muted/10 rounded-xl p-4 mb-6 border border-border">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">BACKUP CODES</span>
            <span className="text-xs text-muted ml-auto">(One-time use only)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, index) => (
              <div key={index} className="p-2 bg-card rounded-lg text-center font-mono text-sm border border-border">
                {code}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={copyBackupCodes} className="gap-2">
            <Copy className="h-4 w-4" />
            Copy Codes
          </Button>
          <Button variant="outline" onClick={downloadBackupCodes} className="gap-2">
            <Download className="h-4 w-4" />
            Download Codes
          </Button>
        </div>
        
        <div className="mt-4 p-3 bg-warning/10 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
            <p className="text-xs text-muted">
              <strong className="text-foreground">⚠️ Important:</strong> Each code can only be used once. 
              Keep them safe and never share them with anyone.
            </p>
          </div>
        </div>
        
        <Button onClick={resetSetup} className="w-full mt-4">
          Done
        </Button>
      </Card>
    );
  }

  // Disable Confirmation Modal
  if (showDisableConfirm) {
    return (
      <Card className="p-6 border-border">
        <div className="text-center mb-6">
          <div className="h-16 w-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-8 w-8 text-error" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Disable Two-Factor Authentication?</h3>
          <p className="text-muted mt-2">
            Your account will be less secure without 2FA. Enter your password to confirm.
          </p>
        </div>
        
        {error && (
          <div className="mb-4 bg-error/10 border border-error/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-error" />
              <p className="text-sm text-error">{error}</p>
            </div>
          </div>
        )}
        
        <div className="max-w-sm mx-auto">
          <div className="relative mb-6">
            <input
              type="password"
              placeholder="Enter your password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              className="input-field pr-4"
            />
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowDisableConfirm(false);
                setDisablePassword('');
                setError('');
              }} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDisable} disabled={isLoading} className="flex-1 gap-2">
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
              Disable 2FA
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Main Component - Toggle Only
  return (
    <Card className="p-6 border-border hover:shadow-lg transition-all duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
            isEnabled ? 'bg-success/10' : 'bg-muted/10'
          }`}>
            {isEnabled ? (
              <ShieldCheck className="h-6 w-6 text-success" />
            ) : (
              <Shield className="h-6 w-6 text-muted" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h3 className="text-lg font-semibold text-foreground">Two-Factor Authentication</h3>
              {isEnabled && (
                <span className="px-2 py-0.5 text-xs font-medium bg-success/10 text-success rounded-full">
                  Active
                </span>
              )}
            </div>
            <p className="text-sm text-muted max-w-md">
              {isEnabled 
                ? '2FA is currently enabled. Your account requires a verification code from your email each time you sign in.'
                : '2FA is currently disabled. Enable it to add an extra layer of security to your account.'
              }
            </p>
            {isEnabled && (
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <span className="text-xs text-success flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Email Authentication Active
                </span>
                <span className="text-xs text-muted flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  Verification via Email
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-end">
          <ToggleSwitch />
        </div>
      </div>
      
      {isEnabled && (
        <div className="mt-5 pt-4 border-t border-border">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-xs text-muted">
              <p><strong className="text-foreground">🔐 How it works:</strong> When you sign in, we'll send a 6-digit verification code to your email address. Enter that code to complete your login.</p>
              <p className="mt-1">💡 <strong>Tip:</strong> Save your backup codes in a secure place. You can use them if you ever lose access to your email.</p>
            </div>
          </div>
        </div>
      )}
      
      {!isEnabled && (
        <div className="mt-5 pt-4 border-t border-border">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-xs text-muted">
              <p><strong className="text-foreground">📧 Email-based 2FA:</strong> When enabled, you'll receive a verification code via email each time you log in.</p>
              <p className="mt-1">✅ <strong>Benefits:</strong> Protects your account even if your password is compromised.</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}