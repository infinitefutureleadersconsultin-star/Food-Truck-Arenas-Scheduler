'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { signOutUser } from '@/lib/firebase/auth';
import type { ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: 'vendor' | 'admin';
  requiredStatus?: string;
}

export function AuthGuard({
  children,
  requiredRole,
  requiredStatus,
}: AuthGuardProps) {
  const { user, userData, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (userData && requiredRole && userData.role !== requiredRole) {
      if (userData.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
      return;
    }

    if (
      userData &&
      requiredStatus &&
      userData.status !== requiredStatus
    ) {
      // Status mismatch is handled in the render below with cards
      return;
    }
  }, [user, userData, loading, requiredRole, requiredStatus, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check for vendor pending status
  if (userData?.role === 'vendor' && userData.status === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <svg
                className="h-8 w-8 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <CardTitle className="text-xl">Awaiting Approval</CardTitle>
            <CardDescription>
              Your account is currently under review. An administrator will
              review your application and approve your access shortly. You will
              be notified by email once your account is activated.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              variant="outline"
              onClick={async () => {
                await signOutUser();
                router.push('/login');
              }}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check for vendor suspended status
  if (userData?.role === 'vendor' && userData.status === 'suspended') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
            <CardTitle className="text-xl">Account Suspended</CardTitle>
            <CardDescription>
              Your account has been suspended. Please contact the commissary
              administrator for more information about the status of your
              account.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              variant="outline"
              onClick={async () => {
                await signOutUser();
                router.push('/login');
              }}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check required role
  if (requiredRole && userData?.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
