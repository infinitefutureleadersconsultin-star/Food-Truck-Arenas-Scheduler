'use client';

import React, { useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as checkinService from '@/lib/services/checkinService';
import { cn } from '@/lib/utils/cn';

interface CheckOutButtonProps {
  bookingId: string;
  onCheckOut: () => void;
  disabled?: boolean;
}

export function CheckOutButton({
  bookingId,
  onCheckOut,
  disabled = false,
}: CheckOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      await checkinService.checkOut(bookingId, '', 'button');
      onCheckOut();
    } catch (error) {
      console.error('Check-out failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckOut}
      disabled={disabled || isLoading}
      className={cn(
        'h-14 px-8 text-lg font-semibold',
        'bg-orange-500 hover:bg-orange-600 text-white',
        'shadow-md hover:shadow-lg transition-all'
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Checking Out...
        </>
      ) : (
        <>
          <LogOut className="mr-2 h-5 w-5" />
          Check Out
        </>
      )}
    </Button>
  );
}
