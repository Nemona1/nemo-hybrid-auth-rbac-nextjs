'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function VerifyErrorPage({ searchParams }) {
  const [countdown, setCountdown] = useState(5);
  const reason = searchParams?.reason || 'invalid_token';

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/login';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getErrorMessage = () => {
    switch (reason) {
      case 'invalid_token':
        return {
          title: 'Invalid Verification Link',
          message: 'The verification link is invalid or has expired.',
          suggestion: 'Please request a new verification email or register again.'
        };
      case 'server_error':
        return {
          title: 'Server Error',
          message: 'An error occurred while verifying your email.',
          suggestion: 'Please try again later or contact support.'
        };
      default:
        return {
          title: 'Verification Failed',
          message: 'We couldn\'t verify your email address.',
          suggestion: 'Please try again or request a new verification link.'
        };
    }
  };

  const error = getErrorMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <Card className="max-w-md w-full p-8 text-center">
        <div className="h-20 w-20 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="h-10 w-10 text-error" />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-2">{error.title}</h2>
        <p className="text-muted mb-2">{error.message}</p>
        <p className="text-sm text-muted mb-4">{error.suggestion}</p>
        
        <div className="bg-error/5 border border-error/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 justify-center mb-2">
            <RefreshCw className="h-4 w-4 text-error" />
            <span className="text-sm font-medium text-error">Need Help?</span>
          </div>
          <p className="text-xs text-muted">
            If you continue to experience issues, please contact support.
          </p>
        </div>
        
        <p className="text-sm text-muted mb-3">Redirecting to login in {countdown} seconds...</p>
        
        <div className="w-full bg-border rounded-full h-2 mb-4">
          <div 
            className="bg-error h-2 rounded-full transition-all duration-1000"
            style={{ width: `${(countdown / 5) * 100}%` }}
          />
        </div>
        
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-primary hover:text-primary-hover text-sm transition-colors"
        >
          Click here to go to login
          <ArrowRight className="h-3 w-3" />
        </Link>
      </Card>
    </div>
  );
}