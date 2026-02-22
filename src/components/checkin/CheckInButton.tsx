'use client';

import React, { useState } from 'react';
import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as checkinService from '@/lib/services/checkinService';
import { cn } from '@/lib/utils/cn';

interface CheckInButtonProps {
  bookingId: string;
  onCheckIn: () => void;
  disabled?: boolean;
}

export function CheckInButton({
  bookingId,
  onCheckIn,
  disabled = false,
}: CheckInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      await checkinService.checkIn(bookingId, '', 'button');
      onCheckIn();
    } catch (error) {
      console.error('Check-in failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckIn}
      disabled={disabled || isLoading}
      className={cn(
        'h-14 px-8 text-lg font-semibold',
        'bg-green-600 hover:bg-green-700 text-white',
        'shadow-md hover:shadow-lg transition-all'
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Checking In...
        </>
      ) : (
        <>
          <LogIn className="mr-2 h-5 w-5" />
          Check In
        </>
      )}
    </Button>
  );
}
