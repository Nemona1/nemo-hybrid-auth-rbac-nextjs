'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Globe, Smartphone, Laptop, Clock, XCircle, Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionToken, setCurrentSessionToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);

  useEffect(() => {
    fetchSessions();
    // Get current session token from cookie
    const getSessionToken = () => {
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies.find(c => c.trim().startsWith('sessionToken='));
      if (sessionCookie) {
        setCurrentSessionToken(sessionCookie.split('=')[1]);
      }
    };
    getSessionToken();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/user/activity', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      } else if (res.status === 401) {
        toast.error('Session expired. Please login again.');
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionToken) => {
    setRevokingId(sessionToken);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/user/revoke-session', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessionToken })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'Session revoked successfully');
        
        // If revoking current session, redirect to login
        if (sessionToken === currentSessionToken) {
          toast.warning('You revoked your current session. Redirecting to login...');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else {
          fetchSessions();
        }
      } else {
        toast.error(data.error || 'Failed to revoke session');
      }
    } catch (error) {
      console.error('Revoke session error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setRevokingId(null);
    }
  };

  const revokeAllOtherSessions = async () => {
    if (!confirm('Are you sure you want to revoke all other sessions? You will be logged out from all other devices.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/user/revoke-all-sessions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        toast.success('All other sessions revoked successfully');
        fetchSessions();
      } else {
        toast.error('Failed to revoke sessions');
      }
    } catch (error) {
      toast.error('Network error');
    }
  };

  const getDeviceIcon = (userAgent) => {
    if (userAgent?.includes('Mobile')) return <Smartphone className="h-5 w-5" />;
    if (userAgent?.includes('Mac') || userAgent?.includes('Windows') || userAgent?.includes('Linux')) {
      return <Laptop className="h-5 w-5" />;
    }
    return <Globe className="h-5 w-5" />;
  };

  const getDeviceType = (userAgent) => {
    if (userAgent?.includes('Mobile')) return 'Mobile Device';
    if (userAgent?.includes('Mac')) return 'Mac Computer';
    if (userAgent?.includes('Windows')) return 'Windows PC';
    if (userAgent?.includes('Linux')) return 'Linux Computer';
    return 'Unknown Device';
  };

  const isCurrentSession = (sessionToken) => sessionToken === currentSessionToken;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-muted">Loading your active sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Active Sessions</h1>
            <p className="text-muted mt-2">
              Manage devices where you're currently logged in
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={fetchSessions}
              className="gap-2"
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            {sessions.length > 1 && (
              <Button
                variant="danger"
                onClick={revokeAllOtherSessions}
                className="gap-2"
              >
                <Shield className="h-4 w-4" />
                Revoke All Others
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Security Tip */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted">
            <p className="font-medium text-foreground mb-1">Security Tip</p>
            <p>Regularly review your active sessions. If you see any device you don't recognize, click "Revoke" immediately to secure your account.</p>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <Card className="p-12 text-center">
            <Globe className="h-12 w-12 text-muted mx-auto mb-4" />
            <p className="text-muted">No active sessions found</p>
            <p className="text-sm text-muted/70 mt-1">Your current session will appear here once you log in</p>
          </Card>
        ) : (
          sessions.map((session) => {
            const isCurrent = isCurrentSession(session.sessionToken);
            const isRevoking = revokingId === session.sessionToken;
            
            return (
              <Card key={session.sessionToken} className={`p-5 transition-all duration-200 ${isCurrent ? 'border-primary/50 bg-primary/5' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCurrent ? 'bg-primary/20' : 'bg-muted/10'
                    }`}>
                      {getDeviceIcon(session.userAgent)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">
                          {getDeviceType(session.userAgent)}
                        </p>
                        {isCurrent && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                            Current Session
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted mt-1">
                        {session.userAgent?.substring(0, 80) || 'Unknown Browser'}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 mt-2">
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last active: {new Date(session.lastActivity).toLocaleString()}
                        </span>
                        <span className="text-xs text-muted">
                          IP: {session.ipAddress || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={isCurrent ? "secondary" : "danger"}
                    size="sm"
                    onClick={() => revokeSession(session.sessionToken)}
                    disabled={isRevoking}
                    className="gap-2 min-w-[100px]"
                  >
                    {isRevoking ? (
                      <div className="spinner h-4 w-4"></div>
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {isRevoking ? 'Revoking...' : isCurrent ? 'Logout This Device' : 'Revoke'}
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Info Section */}
      <div className="mt-8 p-4 bg-muted/5 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted">
            <p className="font-medium text-foreground mb-1">What happens when you revoke a session?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>The device will be immediately logged out</li>
              <li>Any unsaved work on that device may be lost</li>
              <li>The user will need to log in again to access the system</li>
              <li>This action is logged for security audit purposes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}