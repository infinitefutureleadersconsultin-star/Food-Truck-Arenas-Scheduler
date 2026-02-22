'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { signInWithEmail, getUserClaims } from '@/lib/firebase/auth';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { cn } from '@/lib/utils/cn';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface FieldErrors {
  email?: string;
  password?: string;
}

export function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const validateForm = (): boolean => {
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const handleRedirectByRole = async () => {
    try {
      const claims = await getUserClaims();
      if (!claims) {
        router.push('/dashboard');
        return;
      }

      const role = claims.role as string | undefined;
      const status = claims.status as string | undefined;

      if (role === 'admin') {
        router.push('/admin/dashboard');
        return;
      }

      if (role === 'vendor') {
        if (status === 'active') {
          router.push('/dashboard');
          return;
        }
        if (status === 'pending') {
          setError(
            'Your account is awaiting approval. You will be notified once an admin reviews your application.'
          );
          setLoading(false);
          return;
        }
        if (status === 'suspended') {
          setError(
            'Your account has been suspended. Please contact support for more information.'
          );
          setLoading(false);
          return;
        }
      }

      // Fallback for users without claims set yet
      router.push('/dashboard');
    } catch {
      // If claims retrieval fails, still redirect to dashboard
      router.push('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);
    try {
      await signInWithEmail(formData.email, formData.password);
      await handleRedirectByRole();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to sign in.';
      // Provide user-friendly error messages
      if (
        message.includes('auth/user-not-found') ||
        message.includes('auth/wrong-password') ||
        message.includes('auth/invalid-credential')
      ) {
        setError('Invalid email or password. Please try again.');
      } else if (message.includes('auth/too-many-requests')) {
        setError(
          'Too many failed attempts. Please try again later or reset your password.'
        );
      } else {
        setError(message);
      }
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async () => {
    setLoading(true);
    setError(null);
    await handleRedirectByRole();
  };

  const handleGoogleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
          Welcome Back
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Sign in to your commissary account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            disabled={loading}
            className={cn(fieldErrors.email && 'border-red-500')}
          />
          {fieldErrors.email && (
            <p className="text-xs text-red-600">{fieldErrors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            disabled={loading}
            className={cn(fieldErrors.password && 'border-red-500')}
          />
          {fieldErrors.password && (
            <p className="text-xs text-red-600">{fieldErrors.password}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={loading}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/50"
          />
          <Label htmlFor="remember-me" className="text-sm font-normal">
            Remember me
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

        <GoogleSignInButton
          className="w-full"
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
        />
      </form>

      <p className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="font-medium text-primary hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
