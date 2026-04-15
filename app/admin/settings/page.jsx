'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useSidebar } from '@/context/SidebarContext';
import { useAntiTamper } from '@/hooks/useAntiTamper';
import toast from 'react-hot-toast';
import {
  Settings,
  Shield,
  Globe,
  Mail,
  Database,
  Bell,
  Lock,
  Smartphone,
  Key,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Fingerprint
} from 'lucide-react';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { collapsed } = useSidebar();
  useAntiTamper();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [settings, setSettings] = useState({
    siteName: 'Nemo Auth',
    siteDescription: 'Enterprise Authentication System',
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    sessionTimeout: 60,
    maxLoginAttempts: 3,
    lockoutDuration: 30
  });

  // Check admin permission
  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const user = await res.json();
        if (user.role?.name !== 'ADMIN') {
          toast.error('Access denied. Admin privileges required.');
          router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Permission check error:', error);
      router.push('/login');
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const toggleTwoFactor = async () => {
    setLoading(true);
    try {
      // Simulate enabling 2FA
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTwoFactorEnabled(!twoFactorEnabled);
      toast.success(twoFactorEnabled ? '2FA disabled' : '2FA enabled');
    } catch (error) {
      toast.error('Failed to toggle 2FA');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'two-factor', label: 'Two-Factor Auth', icon: ShieldCheck },
    { id: 'sessions', label: 'Sessions', icon: Smartphone },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 p-8 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
            </div>
            <p className="text-muted">Configure system settings and security preferences</p>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-border mb-6">
            <nav className="flex gap-1 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all
                      ${isActive 
                        ? 'text-primary border-b-2 border-primary bg-primary/5' 
                        : 'text-muted hover:text-foreground hover:bg-muted/5'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* General Settings Tab */}
            {activeTab === 'general' && (
              <>
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">General Settings</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Site Name
                      </label>
                      <input
                        type="text"
                        value={settings.siteName}
                        onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                        className="input-field max-w-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Site Description
                      </label>
                      <textarea
                        value={settings.siteDescription}
                        onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                        className="input-field max-w-md"
                        rows="2"
                      />
                    </div>
                    <div className="flex items-center justify-between py-2 border-t border-border">
                      <div>
                        <p className="font-medium text-foreground">Maintenance Mode</p>
                        <p className="text-xs text-muted">Put the site in maintenance mode</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.maintenanceMode}
                          onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Registration Settings</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium text-foreground">Allow Registration</p>
                        <p className="text-xs text-muted">Allow new users to register</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.allowRegistration}
                          onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium text-foreground">Require Email Verification</p>
                        <p className="text-xs text-muted">Require users to verify their email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.requireEmailVerification}
                          onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* Security Settings Tab */}
            {activeTab === 'security' && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Security Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Session Timeout (seconds)
                    </label>
                    <input
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                      className="input-field max-w-xs"
                    />
                    <p className="text-xs text-muted mt-1">Auto logout after inactivity (1 minute default)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Max Login Attempts
                    </label>
                    <input
                      type="number"
                      value={settings.maxLoginAttempts}
                      onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })}
                      className="input-field max-w-xs"
                    />
                    <p className="text-xs text-muted mt-1">Number of failed attempts before lockout</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Lockout Duration (seconds)
                    </label>
                    <input
                      type="number"
                      value={settings.lockoutDuration}
                      onChange={(e) => setSettings({ ...settings, lockoutDuration: parseInt(e.target.value) })}
                      className="input-field max-w-xs"
                    />
                    <p className="text-xs text-muted mt-1">How long to lock account after max attempts</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Two-Factor Auth Tab */}
            {activeTab === 'two-factor' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Two-Factor Authentication</h2>
                    <p className="text-sm text-muted">Add an extra layer of security to your account</p>
                  </div>
                  <Button
                    onClick={toggleTwoFactor}
                    disabled={loading}
                    variant={twoFactorEnabled ? 'danger' : 'primary'}
                    className="gap-2"
                  >
                    {twoFactorEnabled ? (
                      <>
                        <Shield className="h-4 w-4" />
                        Disable 2FA
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Enable 2FA
                      </>
                    )}
                  </Button>
                </div>

                {twoFactorEnabled ? (
                  <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <div>
                        <p className="font-medium text-success">2FA is enabled</p>
                        <p className="text-xs text-success/80">Your account is protected with two-factor authentication</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Fingerprint className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground">Protect your account with 2FA</p>
                          <p className="text-sm text-muted mt-1">
                            When you enable two-factor authentication, you'll need to enter a verification code from 
                            your authenticator app every time you log in.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/5 rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Setup Instructions:</p>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted">
                        <li>Download Google Authenticator or Authy</li>
                        <li>Scan the QR code when prompted</li>
                        <li>Enter the 6-digit code to verify</li>
                        <li>Save your backup codes in a safe place</li>
                      </ol>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Active Sessions</h2>
                  <Button variant="outline" size="sm" className="gap-1">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Smartphone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {i === 1 ? 'Current Session' : 'Chrome on Windows'}
                          </p>
                          <p className="text-xs text-muted">
                            Last active: {i === 1 ? 'Just now' : '2 hours ago'} • IP: 192.168.1.{i === 1 ? '1' : '100'}
                          </p>
                        </div>
                      </div>
                      {i !== 1 && (
                        <Button variant="danger" size="sm">
                          Revoke
                        </Button>
                      )}
                      {i === 1 && (
                        <span className="text-xs text-success">Current Device</span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Notification Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-foreground">Email Notifications</p>
                      <p className="text-xs text-muted">Receive email notifications for important events</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-foreground">Security Alerts</p>
                      <p className="text-xs text-muted">Get notified about suspicious login attempts</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </Card>
            )}

            {/* Save Button */}
            {activeTab !== 'two-factor' && activeTab !== 'sessions' && (
              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={loading} className="gap-2">
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}