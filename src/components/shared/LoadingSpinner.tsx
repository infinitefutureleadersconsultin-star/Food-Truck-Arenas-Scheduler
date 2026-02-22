'use client';

import { cn } from '@/lib/utils/cn';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-3',
  lg: 'h-12 w-12 border-4',
};

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-gray-300 border-t-primary',
          sizeClasses[size]
        )}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}

export function FullPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
