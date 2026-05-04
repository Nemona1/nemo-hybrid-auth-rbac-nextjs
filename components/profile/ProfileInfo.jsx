'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Save, RefreshCw, AlertCircle, Lock, Eye, EyeOff, Mail } from 'lucide-react';
import OtpModal from '@/components/ui/OtpModal';
import toast from 'react-hot-toast';

export default function ProfileInfo({ user, onUpdate, loading }) {
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [emailChanged, setEmailChanged] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if email is being changed
    const isEmailChanging = formData.email !== user?.email;
    
    if (isEmailChanging && !formData.currentPassword) {
      toast.error('Current password is required to change email');
      return;
    }
    
    if (!isEmailChanging && !formData.currentPassword) {
      // Name change only - no password required
      await updateProfile(false);
    } else if (isEmailChanging) {
      // Email change - request OTP first
      await requestEmailChange();
    } else {
      // Name change with password
      await updateProfile(false);
    }
  };

  const requestEmailChange = async () => {
    setSaving(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/request-email-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newEmail: formData.email,
          currentPassword: formData.currentPassword
        })
      });
      
      const data = await res.json();
      
      if (res.ok && data.requiresOtpVerification) {
        setPendingEmail(formData.email);
        setShowOtpModal(true);
        toast.success(data.message);
        // Clear password field
        setFormData(prev => ({ ...prev, currentPassword: '' }));
      } else {
        toast.error(data.error || 'Failed to request email change');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const verifyOtpAndCompleteEmailChange = async (otp) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/verify-email-change-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ otp })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setEmailChanged(true);
        toast.success(data.message);
        onUpdate();
        return true;
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (error) {
      throw new Error(error.message);
    }
  };

  const updateProfile = async (isEmailUpdate = false) => {
    setSaving(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      const requestBody = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        currentPassword: formData.currentPassword
      };
      
      // Only include email if it's different
      if (formData.email !== user?.email) {
        requestBody.email = formData.email;
      }
      
      const res = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (data.requiresVerification) {
          setEmailChanged(true);
          toast.success(data.message);
        } else {
          toast.success(data.message);
        }
        setFormData(prev => ({ ...prev, currentPassword: '' }));
        onUpdate();
      } else {
        toast.error(data.error || 'Failed to update profile');
        if (data.error === 'Current password is incorrect') {
          setFormData(prev => ({ ...prev, currentPassword: '' }));
        }
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <>
      <Card className="p-6">
        {/* Email Change Pending Banner */}
        {emailChanged && (
          <div className="mb-6 bg-warning/10 border border-warning/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning">Email Change Requires Verification</p>
                <p className="text-sm text-muted">
                  A verification link has been sent to your new email address. 
                  Your current email remains active until you verify the new one.
                  Please check your email and click the verification link to complete the change.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Email Not Verified Warning Banner */}
        {user && !user.isVerified && !emailChanged && (
          <div className="mb-6 bg-warning/10 border border-warning/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning">Email Not Verified</p>
                <p className="text-sm text-muted">
                  Please check your email for a verification link. If you didn't receive it,
                  <button 
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('accessToken');
                        const res = await fetch('/api/auth/resend-verification', {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (res.ok) {
                          toast.success('Verification email sent. Please check your inbox.');
                        } else {
                          toast.error('Failed to send verification email');
                        }
                      } catch (error) {
                        toast.error('Network error');
                      }
                    }}
                    className="text-primary hover:underline ml-1"
                  >
                    click here to resend
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="input-field"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Current Email (Active)
            </label>
            <input
              type="email"
              value={user?.email || ''}
              className="input-field bg-muted/20"
              disabled
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              New Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="input-field pl-10"
                placeholder="Enter new email address"
              />
            </div>
            <p className="text-xs text-muted mt-1">
              A verification code will be sent to your current email, then a confirmation link to your new email.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Current Password <span className="text-error">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="currentPassword"
                value={formData.currentPassword || ''}
                onChange={handleInputChange}
                className="input-field pl-10 pr-10"
                placeholder="Enter your current password"
                required={formData.email !== user?.email}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="h-4 w-4 text-muted" /> : <Eye className="h-4 w-4 text-muted" />}
              </button>
            </div>
            <p className="text-xs text-muted mt-1">
              Password is required for security reasons when changing email
            </p>
          </div>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || loading} className="gap-2">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* OTP Modal */}
      <OtpModal
        isOpen={showOtpModal}
        onClose={() => {
          setShowOtpModal(false);
          setPendingEmail('');
        }}
        onVerify={verifyOtpAndCompleteEmailChange}
        email={user?.email}
        loading={saving}
      />
    </>
  );
}