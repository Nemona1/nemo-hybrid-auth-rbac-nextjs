'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function AlreadyVerifiedPage() {
  const [countdown, setCountdown] = useState(3);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <Card className="max-w-md w-full p-8 text-center">
        <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Already Verified</h2>
        <p className="text-muted mb-4">This email has already been verified.</p>
        <p className="text-sm text-muted mb-6">Redirecting to login in {countdown} seconds...</p>
        <Link href="/login" className="text-primary hover:text-primary-hover text-sm">
          Go to Login →
        </Link>
      </Card>
    </div>
  );
}