'use client';

import React, { useMemo, useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import type { Booking } from '@/lib/types';

interface CalendarGridProps {
  currentDate: Date;
  bookings: Booking[];
  onDateSelect: (date: Date) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarGrid({
  currentDate,
  bookings,
  onDateSelect,
}: CalendarGridProps) {
  const [displayMonth, setDisplayMonth] = useState(currentDate);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    bookings.forEach((booking) => {
      if (!map[booking.date]) map[booking.date] = [];
      map[booking.date].push(booking);
    });
    return map;
  }, [bookings]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(displayMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [displayMonth]);

  const handlePrevMonth = () => {
    setDisplayMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setDisplayMonth((prev) => addMonths(prev, 1));
  };

  const handleToday = () => {
    setDisplayMonth(new Date());
    onDateSelect(new Date());
  };

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">
            {format(displayMonth, 'MMMM yyyy')}
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={handleToday}>
          Today
        </Button>
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-t-lg overflow-hidden">
        {DAYS_OF_WEEK.map((dayName) => (
          <div
            key={dayName}
            className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-500"
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-b-lg overflow-hidden -mt-4">
        {days.map((dayDate, idx) => {
          const dateStr = format(dayDate, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(dayDate, displayMonth);
          const isSelected = isSameDay(dayDate, currentDate);
          const isToday = isSameDay(dayDate, new Date());
          const dayBookings = bookingsByDate[dateStr] || [];

          const confirmedCount = dayBookings.filter(
            (b) => b.status === 'confirmed' || b.status === 'checked_in'
          ).length;
          const pendingCount = dayBookings.filter(
            (b) => b.status === 'pending'
          ).length;

          return (
            <button
              key={idx}
              type="button"
              className={cn(
                'relative bg-white p-2 min-h-[80px] text-left transition-colors hover:bg-gray-50',
                !isCurrentMonth && 'bg-gray-50/50',
                isSelected && 'ring-2 ring-inset ring-primary'
              )}
              onClick={() => onDateSelect(dayDate)}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                  !isCurrentMonth && 'text-gray-300',
                  isCurrentMonth && 'text-gray-900',
                  isToday && 'bg-primary text-white font-semibold'
                )}
              >
                {format(dayDate, 'd')}
              </span>

              {/* Booking dots */}
              {dayBookings.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {confirmedCount > 0 && (
                    <div className="flex items-center gap-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      <span className="text-[10px] text-blue-600">
                        {confirmedCount}
                      </span>
                    </div>
                  )}
                  {pendingCount > 0 && (
                    <div className="flex items-center gap-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                      <span className="text-[10px] text-yellow-600">
                        {pendingCount}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
