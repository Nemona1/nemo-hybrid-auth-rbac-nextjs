'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function VerifySuccessPage() {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/login?verified=true';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <Card className="max-w-md w-full p-8 text-center">
        <CheckCircle className="h-16 w-16 text-success mx-auto mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Email Verified!</h2>
        <p className="text-muted mb-4">Your email has been successfully verified.</p>
        <p className="text-sm text-muted mb-6">Redirecting to login in {countdown} seconds...</p>
        <div className="w-full bg-border rounded-full h-2 mb-4">
          <div 
            className="bg-success h-2 rounded-full transition-all duration-1000"
            style={{ width: `${(countdown / 5) * 100}%` }}
          />
        </div>
        <Link href="/login?verified=true" className="text-primary hover:text-primary-hover text-sm">
          Click here if not redirected automatically →
        </Link>
      </Card>
    </div>
  );
}