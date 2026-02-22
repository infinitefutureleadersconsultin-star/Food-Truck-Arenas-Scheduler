'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday as dfIsToday,
} from 'date-fns';
import { useUserBookings } from '@/lib/hooks/useBookings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils/cn';
import { formatTime } from '@/lib/utils/dateUtils';
import type { Booking } from '@/lib/types';

// ---------------------------------------------------------------------------
// Calendar Page
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { bookings, loading, error } = useUserBookings();

  // Build a map of date-string -> bookings for quick lookup
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings.forEach((b) => {
      const existing = map.get(b.date) ?? [];
      existing.push(b);
      map.set(b.date, existing);
    });
    return map;
  }, [bookings]);

  // Calendar grid dates
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  // Bookings for selected date
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedBookings = useMemo(() => {
    return (bookingsByDate.get(selectedDateStr) ?? []).sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );
  }, [bookingsByDate, selectedDateStr]);

  // Navigation
  const goToPrevMonth = useCallback(() => setCurrentMonth((m) => subMonths(m, 1)), []);
  const goToNextMonth = useCallback(() => setCurrentMonth((m) => addMonths(m, 1)), []);
  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedDate(now);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-red-600">Failed to load bookings: {error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your bookings in a monthly calendar.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="min-w-[140px] text-center text-lg font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Today
          </Button>
        </CardHeader>

        <CardContent>
          {/* Day headers */}
          <div className="mb-1 grid grid-cols-7 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="py-2 text-xs font-medium uppercase text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayBookings = bookingsByDate.get(dateStr) ?? [];
              const activeBookings = dayBookings.filter(
                (b) => b.status !== 'cancelled' && b.status !== 'no_show',
              );
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentDay = dfIsToday(day);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'relative flex flex-col items-center gap-0.5 border border-gray-100 px-1 py-2 text-sm transition-colors hover:bg-gray-50',
                    !isCurrentMonth && 'text-gray-300',
                    isCurrentMonth && 'text-gray-700',
                    isSelected && 'bg-primary/5 ring-2 ring-primary/30',
                    isCurrentDay && !isSelected && 'bg-blue-50',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-sm',
                      isCurrentDay && 'bg-primary font-bold text-white',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {/* Dots for bookings */}
                  {activeBookings.length > 0 && (
                    <div className="flex gap-0.5">
                      {activeBookings.slice(0, 3).map((b, i) => (
                        <span
                          key={i}
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            b.status === 'confirmed' && 'bg-green-500',
                            b.status === 'pending' && 'bg-yellow-500',
                            b.status === 'checked_in' && 'bg-blue-500',
                            b.status === 'completed' && 'bg-gray-400',
                          )}
                        />
                      ))}
                      {activeBookings.length > 3 && (
                        <span className="text-[10px] text-gray-400">
                          +{activeBookings.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Bookings for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedBookings.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No bookings"
              description={`You have no bookings on ${format(selectedDate, 'MMM d, yyyy')}.`}
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {selectedBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {formatTime(booking.startTime)} -{' '}
                        {formatTime(booking.endTime)}
                      </span>
                      <StatusBadge status={booking.status} type="booking" />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {booking.resources
                        .map((r) => r.resourceName)
                        .join(', ') || 'No resources assigned'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
