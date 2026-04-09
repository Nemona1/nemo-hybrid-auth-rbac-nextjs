'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { 
  Briefcase, Send, AlertCircle, Clock, CheckCircle, 
  History, XCircle, Info, Shield, LogOut, RefreshCw, 
  Mail, Award, Calendar, UserCheck, ThumbsUp, ThumbsDown,
  ArrowRight, Loader2, FileText
} from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function RoleRequestPage() {
  const router = useRouter();
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState(null);
  const [rejections, setRejections] = useState([]);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  const getToken = () => {
    const token = localStorage.getItem('accessToken');
    return token;
  };

  const handleLogout = async () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  useEffect(() => {
    const init = async () => {
      const token = getToken();
      
      if (!token) {
        toast.error('Please login first');
        router.push('/login');
        return;
      }
      
      try {
        const userRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
          
          if (userData.applicationStatus === 'APPROVED') {
            const roleName = userData.role?.name;
            if (roleName === 'ADMIN') router.push('/dashboard/admin');
            else if (roleName === 'MANAGER') router.push('/dashboard/manager');
            else if (roleName === 'EDITOR') router.push('/dashboard/editor');
            else if (roleName === 'VIEWER') router.push('/dashboard/viewer');
            else router.push('/dashboard');
            return;
          }
        } else if (userRes.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          router.push('/login');
          return;
        }
        
        await Promise.all([fetchRoles(), fetchApplication()]);
      } catch (error) {
        console.error('Init error:', error);
        toast.error('Failed to load page');
      } finally {
        setAuthLoading(false);
      }
    };
    
    init();
  }, [router]);

  const fetchRoles = async () => {
    try {
      const token = getToken();
      if (!token) return;
      
      const res = await fetch('/api/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchApplication = async () => {
    try {
      const token = getToken();
      if (!token) return;
      
      const res = await fetch('/api/user/role-application', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setApplication(data.application);
        setRejections(data.rejections || []);
      }
    } catch (error) {
      console.error('Failed to fetch application:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRole) {
      toast.error('Please select a role');
      return;
    }
    
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        toast.error('Please login again');
        router.push('/login');
        return;
      }
      
      const res = await fetch('/api/user/role-application', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requestedRoleId: selectedRole,
          justification
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Application submitted successfully!');
        await fetchApplication();
        setSelectedRole('');
        setJustification('');
        setShowApplicationForm(false);
      } else {
        toast.error(data.error || 'Failed to submit application');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted">Loading your request portal...</p>
        </div>
      </div>
    );
  }

  // Show application status when user has submitted an application
  if (application) {
    const isPending = application.status === 'PENDING';
    const isApproved = application.status === 'APPROVED';
    const isRejected = application.status === 'REJECTED';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-border sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">N</span>
              </div>
              <span className="text-xl font-bold text-foreground">Nemo Auth</span>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-error/10 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <Card className="overflow-hidden border-0 shadow-xl">
            {/* Status Header */}
            <div className={`p-8 text-center ${
              isPending ? 'bg-amber-50 dark:bg-amber-950/20' :
              isApproved ? 'bg-emerald-50 dark:bg-emerald-950/20' :
              'bg-rose-50 dark:bg-rose-950/20'
            }`}>
              <div className={`h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isPending ? 'bg-amber-100 dark:bg-amber-900/50' :
                isApproved ? 'bg-emerald-100 dark:bg-emerald-900/50' :
                'bg-rose-100 dark:bg-rose-900/50'
              }`}>
                {isPending && <Clock className="h-10 w-10 text-amber-600" />}
                {isApproved && <CheckCircle className="h-10 w-10 text-emerald-600" />}
                {isRejected && <XCircle className="h-10 w-10 text-rose-600" />}
              </div>
              <h1 className={`text-3xl font-bold mb-2 ${
                isPending ? 'text-amber-600' :
                isApproved ? 'text-emerald-600' :
                'text-rose-600'
              }`}>
                {isPending && 'Application Under Review'}
                {isApproved && 'Application Approved! 🎉'}
                {isRejected && 'Application Not Approved'}
              </h1>
              <p className="text-muted max-w-md mx-auto">
                {isPending && 'Your role application is being reviewed by an administrator. You will receive an email notification once a decision is made.'}
                {isApproved && `Congratulations! Your application for the ${application.requestedRole?.name} role has been approved. You can now access your dashboard.`}
                {isRejected && 'Your application was not approved at this time. You can submit a new application after reviewing the feedback below.'}
              </p>
            </div>

            {/* Application Details */}
            <div className="p-8 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Application Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted/5 rounded-lg p-4">
                  <p className="text-xs text-muted mb-1">Requested Role</p>
                  <p className="text-lg font-semibold text-foreground">{application.requestedRole?.name}</p>
                </div>
                <div className="bg-muted/5 rounded-lg p-4">
                  <p className="text-xs text-muted mb-1">Submitted On</p>
                  <p className="text-lg font-semibold text-foreground">{new Date(application.createdAt).toLocaleDateString()}</p>
                </div>
                {application.justification && (
                  <div className="md:col-span-2 bg-muted/5 rounded-lg p-4">
                    <p className="text-xs text-muted mb-1">Your Justification</p>
                    <p className="text-foreground">{application.justification}</p>
                  </div>
                )}
                {application.reviewedAt && (
                  <>
                    <div className="bg-muted/5 rounded-lg p-4">
                      <p className="text-xs text-muted mb-1">Reviewed On</p>
                      <p className="text-foreground">{new Date(application.reviewedAt).toLocaleDateString()}</p>
                    </div>
                    {application.reviewedReason && (
                      <div className="md:col-span-2 bg-muted/5 rounded-lg p-4">
                        <p className="text-xs text-muted mb-1">Review Feedback</p>
                        <p className="text-foreground">{application.reviewedReason}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Rejection History */}
            {rejections.length > 0 && (
              <div className="p-8 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <History className="h-5 w-5 text-muted" />
                  Application History
                </h2>
                <div className="space-y-3">
                  {rejections.map((rejection, index) => (
                    <div key={rejection.id} className="flex items-start gap-3 p-4 bg-muted/5 rounded-lg">
                      <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
                        <ThumbsDown className="h-4 w-4 text-rose-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap justify-between gap-2 mb-1">
                          <span className="font-medium text-foreground">Attempt #{index + 1}: {rejection.requestedRole?.name}</span>
                          <span className="text-xs text-muted">{new Date(rejection.rejectedAt).toLocaleDateString()}</span>
                        </div>
                        {rejection.reason && (
                          <p className="text-sm text-muted mt-1">Reason: {rejection.reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-8 text-center">
              {isApproved && (
                <Button onClick={() => {
                  const roleName = user?.role?.name;
                  if (roleName === 'ADMIN') router.push('/dashboard/admin');
                  else if (roleName === 'MANAGER') router.push('/dashboard/manager');
                  else if (roleName === 'EDITOR') router.push('/dashboard/editor');
                  else router.push('/dashboard/viewer');
                }} className="gap-2">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              
              {isRejected && (
                <Button onClick={() => {
                  setApplication(null);
                  setShowApplicationForm(true);
                }} className="gap-2">
                  Submit New Application
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              
              {isPending && (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Mail className="h-4 w-4" />
                    <span>You will be notified via email once a decision is made</span>
                  </div>
                  <Button variant="outline" onClick={handleLogout} className="gap-2">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Show role selection form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">N</span>
            </div>
            <span className="text-xl font-bold text-foreground">Nemo Auth</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-error/10 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <Card className="overflow-hidden border-0 shadow-xl">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 text-center">
            <div className="h-16 w-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Briefcase className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Request a Role</h1>
            <p className="text-muted max-w-md mx-auto">
              Select a role that matches your responsibilities to access system features
            </p>
          </div>

          {/* Info Banner */}
          <div className="p-6 border-b border-border bg-primary/5">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted">
                <p className="font-medium text-foreground mb-2">What happens after submission?</p>
                <ul className="space-y-1">
                  <li>✓ Your application will be reviewed by an administrator</li>
                  <li>✓ You will receive an email notification once a decision is made</li>
                  <li>✓ If rejected, you can reapply after reviewing the feedback</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Role Selection Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Available Roles
                </label>
                {roles.length === 0 ? (
                  <div className="text-center py-12 bg-muted/5 rounded-xl">
                    <Shield className="h-12 w-12 mx-auto mb-3 text-muted/50" />
                    <p className="text-muted">No roles available to request</p>
                    <p className="text-sm text-muted/70 mt-1">Please contact an administrator</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id)}
                        className={`group relative p-5 border-2 rounded-xl text-left transition-all duration-200 ${
                          selectedRole === role.id
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-md'
                            : 'border-border hover:border-primary/50 bg-card hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground text-lg mb-1">{role.name}</h3>
                            <p className="text-sm text-muted">{role.description || 'No description available'}</p>
                          </div>
                          {selectedRole === role.id && (
                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="justification" className="block text-sm font-medium text-foreground mb-2">
                  Justification <span className="text-muted font-normal">(Optional but recommended)</span>
                </label>
                <textarea
                  id="justification"
                  rows="4"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="input-field resize-none"
                  placeholder="Explain why you need this role, what you plan to accomplish, and how it benefits the organization..."
                />
                <p className="text-xs text-muted mt-2 flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  A well-written justification increases your chances of approval
                </p>
              </div>

              <Button 
                type="submit" 
                disabled={loading || roles.length === 0 || !selectedRole} 
                className="w-full py-6 text-lg gap-3"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                {loading ? 'Submitting Application...' : 'Submit Application'}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}