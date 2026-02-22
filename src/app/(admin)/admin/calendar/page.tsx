'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarOff,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { cn } from '@/lib/utils/cn';
import { useCalendar } from '@/lib/hooks/useCalendar';
import { useBookings } from '@/lib/hooks/useBookings';
import { useResourceTypes } from '@/lib/hooks/useResourceTypes';
import { useResources } from '@/lib/hooks/useResources';
import { formatTime } from '@/lib/utils/dateUtils';
import type { Booking } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM
const VIEW_OPTIONS = [
  { value: 'day' as const, label: 'Day' },
  { value: 'week' as const, label: 'Week' },
  { value: 'month' as const, label: 'Month' },
];

const VENDOR_COLORS = [
  'bg-blue-200 border-blue-400 text-blue-900',
  'bg-green-200 border-green-400 text-green-900',
  'bg-purple-200 border-purple-400 text-purple-900',
  'bg-orange-200 border-orange-400 text-orange-900',
  'bg-pink-200 border-pink-400 text-pink-900',
  'bg-teal-200 border-teal-400 text-teal-900',
  'bg-indigo-200 border-indigo-400 text-indigo-900',
  'bg-amber-200 border-amber-400 text-amber-900',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const {
    selectedDate,
    view,
    setView,
    formattedDate,
    goToNext,
    goToPrevious,
    goToToday,
    goToDate,
    weekDates,
    monthDates,
    isSameDay,
    isToday,
  } = useCalendar();

  const { bookings, loading: bookingsLoading } = useBookings();
  const { resources, loading: resourcesLoading } = useResources();
  const { resourceTypes, loading: typesLoading } = useResourceTypes();

  const loading = bookingsLoading || resourcesLoading || typesLoading;

  // Blackout date dialog
  const [blackoutDialogOpen, setBlackoutDialogOpen] = useState(false);
  const [blackoutDate, setBlackoutDate] = useState('');
  const [blackoutReason, setBlackoutReason] = useState('');

  // Booking detail dialog
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);

  // Color map for vendors
  const vendorColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const uniqueVendors = Array.from(new Set(bookings.map((b) => b.userId)));
    uniqueVendors.forEach((id, i) => {
      map[id] = VENDOR_COLORS[i % VENDOR_COLORS.length];
    });
    return map;
  }, [bookings]);

  // Filter bookings for a specific date
  const getBookingsForDate = useCallback(
    (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return bookings.filter((b) => b.date === dateStr);
    },
    [bookings]
  );

  // Get resource names for day view columns
  const resourceColumns = useMemo(() => {
    return resources.map((r) => ({
      id: r.id,
      name: r.name,
      typeName: r.typeName,
    }));
  }, [resources]);

  // Booking position in day view
  const getBookingStyle = useCallback(
    (booking: Booking) => {
      const [startH, startM] = booking.startTime.split(':').map(Number);
      const [endH, endM] = booking.endTime.split(':').map(Number);

      const top = ((startH - 6) * 60 + startM) * (64 / 60); // 64px per hour
      const height = ((endH - startH) * 60 + (endM - startM)) * (64 / 60);

      return {
        top: `${Math.max(0, top)}px`,
        height: `${Math.max(16, height)}px`,
      };
    },
    []
  );

  const handleBookingClick = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setBookingDetailOpen(true);
  }, []);

  const handleAddBlackout = useCallback(() => {
    // In a full implementation, this would save to Firestore
    setBlackoutDialogOpen(false);
    setBlackoutDate('');
    setBlackoutReason('');
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Master Calendar</h1>
        <Button
          variant="outline"
          onClick={() => setBlackoutDialogOpen(true)}
        >
          <CalendarOff className="mr-2 h-4 w-4" />
          Add Blackout Date
        </Button>
      </div>

      {/* Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="ml-2 text-lg font-semibold">{formattedDate}</h2>
            </div>
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
              {VIEW_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    view === opt.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                  onClick={() => setView(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Content */}
      {view === 'day' && (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Column headers */}
                <div className="flex border-b border-gray-200">
                  <div className="w-20 shrink-0 px-2 py-3 text-xs font-medium text-gray-500">
                    Time
                  </div>
                  {resourceColumns.slice(0, 8).map((resource) => (
                    <div
                      key={resource.id}
                      className="flex-1 border-l border-gray-200 px-2 py-3 text-center"
                    >
                      <div className="text-xs font-medium text-gray-900">
                        {resource.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {resource.typeName}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time grid */}
                <div className="relative">
                  {HOURS.map((hour) => (
                    <div key={hour} className="flex border-b border-gray-100">
                      <div className="w-20 shrink-0 px-2 py-4 text-right text-xs text-gray-400">
                        {hour > 12 ? hour - 12 : hour}:00{' '}
                        {hour >= 12 ? 'PM' : 'AM'}
                      </div>
                      {resourceColumns.slice(0, 8).map((resource) => {
                        const dayBookings = getBookingsForDate(selectedDate);
                        const resourceBookings = dayBookings.filter((b) =>
                          b.resources.some((r) => r.resourceId === resource.id)
                        );

                        return (
                          <div
                            key={resource.id}
                            className="relative flex-1 border-l border-gray-100"
                            style={{ height: '64px' }}
                          >
                            {hour === HOURS[0] &&
                              resourceBookings.map((booking) => {
                                const style = getBookingStyle(booking);
                                return (
                                  <div
                                    key={booking.id}
                                    className={cn(
                                      'absolute inset-x-1 z-10 cursor-pointer rounded border px-1 py-0.5 text-xs overflow-hidden',
                                      vendorColorMap[booking.userId] ??
                                        'bg-blue-200 border-blue-400 text-blue-900'
                                    )}
                                    style={style}
                                    onClick={() => handleBookingClick(booking)}
                                    title={`${booking.businessName || booking.userName}: ${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`}
                                  >
                                    <div className="truncate font-medium">
                                      {booking.businessName || booking.userName}
                                    </div>
                                    <div className="truncate opacity-75">
                                      {formatTime(booking.startTime)} -{' '}
                                      {formatTime(booking.endTime)}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {view === 'week' && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-7 gap-px rounded-lg border border-gray-200 bg-gray-200">
              {weekDates.map((date) => {
                const dayBookings = getBookingsForDate(date);
                const today = isToday(date);
                return (
                  <div
                    key={date.toISOString()}
                    className={cn(
                      'min-h-[160px] bg-white p-2',
                      today && 'bg-blue-50'
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          today ? 'text-blue-700' : 'text-gray-700'
                        )}
                      >
                        {format(date, 'EEE d')}
                      </span>
                      {today && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayBookings.slice(0, 4).map((booking) => (
                        <div
                          key={booking.id}
                          className={cn(
                            'cursor-pointer rounded border px-1.5 py-1 text-xs',
                            vendorColorMap[booking.userId] ??
                              'bg-blue-200 border-blue-400 text-blue-900'
                          )}
                          onClick={() => handleBookingClick(booking)}
                        >
                          <div className="truncate font-medium">
                            {booking.businessName || booking.userName}
                          </div>
                          <div className="opacity-75">
                            {formatTime(booking.startTime)}
                          </div>
                        </div>
                      ))}
                      {dayBookings.length > 4 && (
                        <button
                          className="w-full text-left text-xs text-blue-600 hover:underline"
                          onClick={() => {
                            goToDate(date);
                            setView('day');
                          }}
                        >
                          +{dayBookings.length - 4} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {view === 'month' && (
        <Card>
          <CardContent className="pt-6">
            {/* Day headers */}
            <div className="mb-2 grid grid-cols-7 text-center text-sm font-medium text-gray-500">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-7 gap-px rounded-lg border border-gray-200 bg-gray-200">
              {/* Pad start of month */}
              {Array.from({ length: monthDates[0]?.getDay() ?? 0 }).map(
                (_, i) => (
                  <div key={`pad-${i}`} className="min-h-[100px] bg-gray-50" />
                )
              )}

              {monthDates.map((date) => {
                const dayBookings = getBookingsForDate(date);
                const today = isToday(date);
                return (
                  <div
                    key={date.toISOString()}
                    className={cn(
                      'min-h-[100px] bg-white p-1.5',
                      today && 'bg-blue-50'
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <button
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                          today
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        )}
                        onClick={() => {
                          goToDate(date);
                          setView('day');
                        }}
                      >
                        {format(date, 'd')}
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      {dayBookings.slice(0, 2).map((booking) => (
                        <div
                          key={booking.id}
                          className={cn(
                            'cursor-pointer truncate rounded px-1 py-0.5 text-xs',
                            vendorColorMap[booking.userId] ??
                              'bg-blue-200 text-blue-900'
                          )}
                          onClick={() => handleBookingClick(booking)}
                        >
                          {booking.businessName || booking.userName}
                        </div>
                      ))}
                      {dayBookings.length > 2 && (
                        <button
                          className="w-full text-left text-xs text-blue-600 hover:underline"
                          onClick={() => {
                            goToDate(date);
                            setView('day');
                          }}
                        >
                          +{dayBookings.length - 2} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Detail Dialog */}
      <Dialog open={bookingDetailOpen} onOpenChange={setBookingDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              {selectedBooking?.businessName || selectedBooking?.userName}
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Date:</span>
                  <p>{selectedBooking.date}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Time:</span>
                  <p>
                    {formatTime(selectedBooking.startTime)} -{' '}
                    {formatTime(selectedBooking.endTime)}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Status:</span>
                  <p className="capitalize">
                    {selectedBooking.status.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Vendor:</span>
                  <p>{selectedBooking.userName}</p>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Resources:
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedBooking.resources.map((r, i) => (
                    <Badge key={i} variant="secondary">
                      {r.resourceName}
                    </Badge>
                  ))}
                </div>
              </div>
              {selectedBooking.notes && (
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Notes:
                  </span>
                  <p className="text-sm">{selectedBooking.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBookingDetailOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Blackout Date Dialog */}
      <Dialog open={blackoutDialogOpen} onOpenChange={setBlackoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Blackout Date</DialogTitle>
            <DialogDescription>
              Block a date from accepting any bookings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="blackout-date">Date</Label>
              <Input
                id="blackout-date"
                type="date"
                value={blackoutDate}
                onChange={(e) => setBlackoutDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blackout-reason">Reason</Label>
              <Textarea
                id="blackout-reason"
                placeholder="Why is this date blocked?"
                value={blackoutReason}
                onChange={(e) => setBlackoutReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBlackoutDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddBlackout}
              disabled={!blackoutDate || !blackoutReason}
            >
              Add Blackout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
