'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { Briefcase, Send, AlertCircle, Clock, CheckCircle } from 'lucide-react';

export default function RoleRequestPage() {
  const router = useRouter();
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingApplication, setExistingApplication] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }
      
      try {
        // Get user data
        const userRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
          
          // If already approved, redirect to appropriate dashboard
          if (userData.applicationStatus === 'APPROVED') {
            const roleName = userData.role?.name;
            if (roleName === 'ADMIN') router.push('/dashboard/admin');
            else if (roleName === 'MANAGER') router.push('/dashboard/manager');
            else if (roleName === 'EDITOR') router.push('/dashboard/editor');
            else if (roleName === 'VIEWER') router.push('/dashboard/viewer');
            else router.push('/dashboard');
            return;
          }
        }
        
        await fetchRoles();
        await fetchExistingApplication();
      } catch (error) {
        console.error('Init error:', error);
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
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
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
        toast.success('Role application submitted successfully!');
        await fetchExistingApplication();
        setSelectedRole('');
        setJustification('');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to submit application');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (existingApplication) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto ${
            existingApplication.status === 'PENDING' ? 'bg-warning/10' :
            existingApplication.status === 'APPROVED' ? 'bg-success/10' : 'bg-error/10'
          }`}>
            {existingApplication.status === 'PENDING' && <Clock className="h-8 w-8 text-warning" />}
            {existingApplication.status === 'APPROVED' && <CheckCircle className="h-8 w-8 text-success" />}
            {existingApplication.status === 'REJECTED' && <AlertCircle className="h-8 w-8 text-error" />}
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {existingApplication.status === 'PENDING' && 'Application Pending'}
            {existingApplication.status === 'APPROVED' && 'Application Approved!'}
            {existingApplication.status === 'REJECTED' && 'Application Rejected'}
          </h2>
          
          <p className="text-muted mb-4">
            {existingApplication.status === 'PENDING' && 'Your role application is being reviewed.'}
            {existingApplication.status === 'APPROVED' && 'You can now access your dashboard.'}
            {existingApplication.status === 'REJECTED' && 'You can submit a new application.'}
          </p>
          
          {existingApplication.reviewedReason && (
            <p className="text-sm text-muted mb-4">
              <strong>Reason:</strong> {existingApplication.reviewedReason}
            </p>
          )}
          
          {existingApplication.status === 'APPROVED' && (
            <Button onClick={() => {
              const roleName = user?.role?.name;
              if (roleName === 'ADMIN') router.push('/dashboard/admin');
              else if (roleName === 'MANAGER') router.push('/dashboard/manager');
              else if (roleName === 'EDITOR') router.push('/dashboard/editor');
              else router.push('/dashboard/viewer');
            }}>
              Go to Dashboard
            </Button>
          )}
          
          {existingApplication.status === 'REJECTED' && (
            <Button onClick={() => setExistingApplication(null)}>
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
          <p className="text-muted mt-2">Select a role to access system features</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Select Role</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {roles.map((role) => (
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
              ))}
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
              placeholder="Explain why you need this role..."
            />
          </div>
          
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <div className="spinner"></div> : <><Send className="h-5 w-5 mr-2" /> Submit Application</>}
          </Button>
        </form>
      </Card>
    </div>
  );
}