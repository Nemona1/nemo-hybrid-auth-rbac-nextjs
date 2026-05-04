'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Mail, ArrowRight, LogOut } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function EmailChangedPage() {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/login?email_changed=true';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <Card className="max-w-md w-full p-8 text-center">
        <div className="h-20 w-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="h-10 w-10 text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-2">Email Changed Successfully!</h2>
        <p className="text-muted mb-2">Your email address has been updated.</p>
        <p className="text-sm text-warning mb-4">You have been logged out for security reasons.</p>
        
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 justify-center mb-2">
            <LogOut className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-warning">Security Notice</span>
          </div>
          <p className="text-xs text-muted">
            Please log in again using your <strong>new email address</strong>.
          </p>
        </div>
        
        <p className="text-sm text-muted mb-3">Redirecting to login in {countdown} seconds...</p>
        
        <div className="w-full bg-border rounded-full h-2 mb-4">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-1000"
            style={{ width: `${(countdown / 5) * 100}%` }}
          />
        </div>
        
        <Link 
          href="/login?email_changed=true" 
          className="inline-flex items-center gap-2 text-primary hover:text-primary-hover text-sm transition-colors"
        >
          Click here to log in with your new email
          <ArrowRight className="h-3 w-3" />
        </Link>
      </Card>
    </div>
  );
}