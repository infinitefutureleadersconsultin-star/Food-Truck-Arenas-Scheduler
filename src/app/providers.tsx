'use client';

import { type ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { BookingProvider } from '@/contexts/BookingContext';
import { TooltipProvider } from '@/components/ui/tooltip';

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BookingProvider>
          <TooltipProvider delayDuration={300}>
            {children}
          </TooltipProvider>
        </BookingProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
