'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function VerifyErrorPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const getMessage = () => {
    switch (reason) {
      case 'expired':
        return 'This verification link has expired. Please register again.';
      case 'invalid_token':
        return 'Invalid verification link. The link may have already been used.';
      default:
        return 'We could not verify your email. The link may be invalid or expired.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4">
      <Card className="max-w-md w-full p-8 text-center">
        <XCircle className="h-16 w-16 text-error mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Verification Failed</h2>
        <p className="text-muted mb-6">{getMessage()}</p>
        <Link href="/login" className="text-primary hover:text-primary-hover text-sm">
          Go to Login →
        </Link>
      </Card>
    </div>
  );
}