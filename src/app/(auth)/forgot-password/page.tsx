'use client';

import { useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPassword } from '@/lib/firebase/auth';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { cn } from '@/lib/utils/cn';

const emailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setFieldError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to send reset email.';
      if (message.includes('auth/user-not-found')) {
        setError(
          'No account found with this email address. Please check and try again.'
        );
      } else if (message.includes('auth/too-many-requests')) {
        setError('Too many requests. Please try again later.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            Check Your Email
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            We&apos;ve sent a password reset link to{' '}
            <span className="font-medium text-gray-900">{email}</span>. Please
            check your inbox and follow the instructions to reset your password.
          </p>
        </div>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setSuccess(false);
              setEmail('');
            }}
          >
            Send Another Link
          </Button>
          <Link
            href="/login"
            className="block text-sm font-medium text-primary hover:underline"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
          Reset Password
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            disabled={loading}
            className={cn(fieldError && 'border-red-500')}
          />
          {fieldError && (
            <p className="text-xs text-red-600">{fieldError}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Sending...
            </>
          ) : (
            'Send Reset Link'
          )}
        </Button>
      </form>

      <p className="text-center">
        <Link
          href="/login"
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}
