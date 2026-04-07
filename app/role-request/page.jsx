'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { Briefcase, FileText, Send, AlertCircle, Clock, CheckCircle } from 'lucide-react';

export default function RoleRequestPage() {
  const router = useRouter();
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingApplication, setExistingApplication] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check authentication and fetch data
  useEffect(() => {
    const init = async () => {
      // Check if user is authenticated
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        toast.error('Please login first');
        router.push('/login');
        return;
      }
      
      // Verify token is valid
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          router.push('/login');
          return;
        }
        
        // Fetch data
        await fetchRoles();
        await fetchExistingApplication();
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      } finally {
        setAuthLoading(false);
      }
    };
    
    init();
  }, [router]);

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/admin/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles.filter(role => role.name !== 'ADMIN'));
      } else if (res.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      toast.error('Failed to load roles');
    }
  };

  const fetchExistingApplication = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/user/role-application', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setExistingApplication(data);
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
      const token = localStorage.getItem('accessToken');
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
      
      if (res.ok) {
        toast.success('Role application submitted successfully! An admin will review it shortly.');
        await fetchExistingApplication();
        // Clear form
        setSelectedRole('');
        setJustification('');
      } else if (res.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        toast.error('Session expired. Please login again.');
        router.push('/login');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="spinner"></div>
      </div>
    );
  }

  // Show application status if exists
  if (existingApplication) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto ${
              existingApplication.status === 'PENDING' ? 'bg-warning/10' :
              existingApplication.status === 'APPROVED' ? 'bg-success/10' : 'bg-error/10'
            }`}>
              {existingApplication.status === 'PENDING' && <Clock className="h-8 w-8 text-warning" />}
              {existingApplication.status === 'APPROVED' && <CheckCircle className="h-8 w-8 text-success" />}
              {existingApplication.status === 'REJECTED' && <AlertCircle className="h-8 w-8 text-error" />}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {existingApplication.status === 'PENDING' && 'Application Pending'}
            {existingApplication.status === 'APPROVED' && 'Application Approved!'}
            {existingApplication.status === 'REJECTED' && 'Application Rejected'}
          </h2>
          
          <p className="text-muted mb-4">
            {existingApplication.status === 'PENDING' && 'Your role application is being reviewed by an administrator.'}
            {existingApplication.status === 'APPROVED' && 'Congratulations! Your role has been approved. You can now access the dashboard.'}
            {existingApplication.status === 'REJECTED' && 'Your role application was not approved at this time.'}
          </p>
          
          {existingApplication.reviewedReason && (
            <p className="text-sm text-muted mb-4">
              <strong>Reason:</strong> {existingApplication.reviewedReason}
            </p>
          )}
          
          {existingApplication.status === 'APPROVED' && (
            <Button onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          )}
          
          {existingApplication.status === 'REJECTED' && (
            <Button onClick={() => {
              setExistingApplication(null);
              setSelectedRole('');
              setJustification('');
            }}>
              Submit New Application
            </Button>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <Card className="max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Request a Role</h1>
          <p className="text-muted mt-2">
            Please select a role to access the system features
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Role
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {roles.length === 0 ? (
                <p className="text-muted col-span-3 text-center">Loading roles...</p>
              ) : (
                roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                      selectedRole === role.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 bg-card'
                    }`}
                  >
                    <h3 className="font-semibold text-foreground">{role.name}</h3>
                    <p className="text-sm text-muted mt-1">{role.description}</p>
                  </button>
                ))
              )}
            </div>
          </div>
          
          <div>
            <label htmlFor="justification" className="block text-sm font-medium text-foreground mb-2">
              Justification
            </label>
            <textarea
              id="justification"
              rows="4"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="input-field"
              placeholder="Explain why you need this role and how you plan to use it..."
            />
          </div>
          
          <Button type="submit" disabled={loading || roles.length === 0} className="w-full">
            {loading ? (
              <div className="spinner"></div>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Submit Application
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}