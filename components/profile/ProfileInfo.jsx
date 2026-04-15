'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Save, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfileInfo({ user, onUpdate, loading }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || ''
  });
  const [emailChanged, setEmailChanged] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (data.requiresVerification) {
          setEmailChanged(true);
          toast.success(data.message);
          
          setTimeout(async () => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
            window.location.href = '/login?email_verification_required=true';
          }, 5000);
        } else {
          toast.success('Profile updated successfully');
          onUpdate();
        }
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      {/* Email Changed Warning Banner */}
      {emailChanged && (
        <div className="mb-6 bg-warning/10 border border-warning/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-warning">Email Change Requires Verification</p>
              <p className="text-sm text-muted">
                A verification link has been sent to your new email address. 
                You will be logged out in a few seconds. Please check your email and verify to continue.
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
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="input-field"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="input-field"
            required
          />
          <p className="text-xs text-muted mt-1">
            Changing your email will require re-verification and you will be logged out
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
  );
}