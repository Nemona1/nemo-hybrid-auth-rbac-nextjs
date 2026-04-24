'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Shield, Key, CheckCircle, AlertCircle, Lock, Copy, Download, 
  RefreshCw, Smartphone, Mail, ShieldCheck, ShieldOff, 
  Info, ShieldAlert, X, Timer, Send
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TwoFactorAuth({ user, onUpdate }) {
  const [isEnabled, setIsEnabled] = useState(user?.twoFactorEnabled === true);
  const [isLoading, setIsLoading] = useState(false);
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [backupCodes, setBackupCodes] = useState(null);
  const [disablePassword, setDisablePassword] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleToggle = () => {
    if (isEnabled) {
      setShowDisableModal(true);
    } else {
      setShowEnableModal(true);
    }
  };

  const handleConfirmEnable = async () => {
    setShowEnableModal(false);
    setIsLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setShowVerifyModal(true);
        setCountdown(60);
        toast.success(data.message);
      } else {
        setError(data.error);
        toast.error(data.error);
      }
    } catch (error) {
      setError('Network error');
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsSendingOtp(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/2fa/resend', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setCountdown(60);
        toast.success('New verification code sent');
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpValue = otpCode.join('');
    if (otpValue.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ otp: otpValue })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setIsEnabled(true);
        setBackupCodes(data.backupCodes);
        setShowVerifyModal(false);
        setOtpCode(['', '', '', '', '', '']);
        toast.success(data.message);
        if (onUpdate) onUpdate();
      } else {
        setError(data.error);
        toast.error(data.error);
      }
    } catch (error) {
      setError('Network error');
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDisable = async () => {
    if (!disablePassword) {
      setError('Please enter your password');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: disablePassword })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setIsEnabled(false);
        setShowDisableModal(false);
        setDisablePassword('');
        toast.success(data.message);
        if (onUpdate) onUpdate();
      } else {
        setError(data.error);
        toast.error(data.error);
      }
    } catch (error) {
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

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);
    setError('');
    
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    if (pastedData && /^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpCode(digits);
    }
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

  // Enable Confirmation Modal
  if (showEnableModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-card rounded-xl shadow-2xl max-w-md w-full border border-border animate-in fade-in zoom-in duration-200">
          <div className="flex justify-between items-center p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Enable Two-Factor Authentication</h3>
            </div>
            <button
              onClick={() => setShowEnableModal(false)}
              className="text-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted">
                Two-factor authentication adds an extra layer of security to your account. 
                You'll receive a verification code via email each time you sign in.
              </p>
            </div>
            
            <div className="bg-muted/5 rounded-lg p-3 mb-6">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-primary mt-0.5" />
                <p className="text-xs text-muted">
                  You'll also receive backup codes that you can use if you lose access to your email.
                </p>
              </div>
            </div>
            
            {error && (
              <div className="mb-4 bg-error/10 border border-error/20 rounded-lg p-3">
                <p className="text-sm text-error">{error}</p>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                onClick={() => setShowEnableModal(false)} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmEnable} disabled={isLoading} className="flex-1 gap-2">
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verify OTP Modal
  if (showVerifyModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-card rounded-xl shadow-2xl max-w-md w-full border border-border animate-in fade-in zoom-in duration-200">
          <div className="flex justify-between items-center p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Verify Your Email</h3>
            </div>
            <button
              onClick={() => {
                setShowVerifyModal(false);
                setOtpCode(['', '', '', '', '', '']);
                setError('');
              }}
              className="text-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Send className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted">
                Enter the 6-digit code sent to <strong className="text-foreground">{user?.email}</strong>
              </p>
            </div>
            
            {error && (
              <div className="mb-4 bg-error/10 border border-error/20 rounded-lg p-3">
                <p className="text-sm text-error text-center">{error}</p>
              </div>
            )}
            
            <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
              {[...Array(6)].map((_, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  value={otpCode[index]}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  className="w-12 h-14 text-center text-2xl font-mono font-bold border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-card"
                  autoFocus={index === 0}
                />
              ))}
            </div>
            
            <Button onClick={handleVerifyOtp} disabled={isLoading} className="w-full gap-2 mb-4">
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Verify & Enable
            </Button>
            
            <div className="text-center">
              <button
                onClick={handleResendCode}
                disabled={countdown > 0 || isSendingOtp}
                className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 mx-auto"
              >
                {isSendingOtp ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : countdown > 0 ? (
                  <span className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    Resend in {countdown}s
                  </span>
                ) : (
                  'Resend Code'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Backup Codes Modal
  if (backupCodes) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-card rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-border animate-in fade-in zoom-in duration-200">
          <div className="sticky top-0 bg-card z-10 flex justify-between items-center p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Backup Codes</h3>
            </div>
            <button
              onClick={() => {
                setBackupCodes(null);
                if (onUpdate) onUpdate();
              }}
              className="text-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="h-16 w-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">2FA Enabled Successfully!</h3>
              <p className="text-muted mt-2 text-sm">
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
            
            <div className="flex gap-3 justify-center mb-6">
              <Button variant="outline" onClick={copyBackupCodes} className="gap-2 flex-1">
                <Copy className="h-4 w-4" />
                Copy Codes
              </Button>
              <Button variant="outline" onClick={downloadBackupCodes} className="gap-2 flex-1">
                <Download className="h-4 w-4" />
                Download Codes
              </Button>
            </div>
            
            <div className="p-3 bg-warning/10 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                <div className="text-xs text-muted">
                  <p><strong className="text-foreground">⚠️ Important:</strong> Each code can only be used once.</p>
                  <p className="mt-1">Keep them safe and never share them with anyone. If you lose these codes, you can generate new ones by disabling and re-enabling 2FA.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="sticky bottom-0 bg-card border-t border-border p-4">
            <Button 
              onClick={() => {
                setBackupCodes(null);
                if (onUpdate) onUpdate();
              }} 
              className="w-full"
            >
              I've Saved My Backup Codes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Disable Confirmation Modal
  if (showDisableModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-card rounded-xl shadow-2xl max-w-md w-full border border-border animate-in fade-in zoom-in duration-200">
          <div className="flex justify-between items-center p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-error" />
              <h3 className="text-lg font-semibold text-foreground">Disable Two-Factor Authentication?</h3>
            </div>
            <button
              onClick={() => setShowDisableModal(false)}
              className="text-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="h-16 w-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-error" />
              </div>
              <p className="text-muted">
                Your account will be less secure without 2FA. Enter your password to confirm.
              </p>
            </div>
            
            {error && (
              <div className="mb-4 bg-error/10 border border-error/20 rounded-lg p-3">
                <p className="text-sm text-error">{error}</p>
              </div>
            )}
            
            <div className="mb-6">
              <input
                type="password"
                placeholder="Enter your password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="input-field"
              />
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowDisableModal(false);
                  setDisablePassword('');
                  setError('');
                }} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmDisable} disabled={isLoading} className="flex-1 gap-2">
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                Disable 2FA
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Component
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