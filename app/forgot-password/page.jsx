'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'If registered, a reset link has been sent.');
        setEmail('');
      } else {
        toast.error(data.error || 'Unable to process your request.');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-muted">
            Enter your email and we will send a secure reset link.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </Button>
          </div>

          <div className="text-center space-y-2 text-sm text-muted">
            <Link href="/login" className="text-primary hover:text-primary-hover transition-colors block">
              Back to sign in
            </Link>
            <Link href="/register" className="text-primary hover:text-primary-hover transition-colors block">
              Need a new account? Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
