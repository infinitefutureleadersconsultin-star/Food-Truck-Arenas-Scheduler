'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ADMIN_EMAILS } from '@/lib/utils/constants';
import type { ReactNode } from 'react';

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, userData, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // If user is loaded and not admin, redirect to vendor dashboard
    if (user && userData && userData.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    // Extra email check for admin verification
    if (
      user &&
      userData &&
      userData.role === 'admin' &&
      ADMIN_EMAILS.length > 0 &&
      !ADMIN_EMAILS.includes(user.email ?? '')
    ) {
      router.push('/dashboard');
      return;
    }
  }, [user, userData, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <AuthGuard requiredRole="admin">
      {children}
    </AuthGuard>
  );
}
