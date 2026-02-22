'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import type { Booking } from '@/lib/types';

interface BookingBlockProps {
  booking: Booking;
  color: string;
  onClick: () => void;
}

export function BookingBlock({ booking, color, onClick }: BookingBlockProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full h-full rounded-md px-2 py-1 text-left text-xs text-white',
        'overflow-hidden cursor-pointer transition-opacity hover:opacity-90',
        'flex flex-col justify-start'
      )}
      style={{ backgroundColor: color }}
      title={`${booking.businessName}: ${booking.startTime} - ${booking.endTime}`}
    >
      <span className="font-medium truncate block">
        {booking.businessName}
      </span>
      <span className="opacity-80 truncate block">
        {booking.startTime} - {booking.endTime}
      </span>
    </button>
  );
}
