'use client';

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils/cn';
import { BookingBlock } from './BookingBlock';
import type { Booking, Resource } from '@/lib/types';

interface CalendarDayViewProps {
  date: Date;
  bookings: Booking[];
  resources: Resource[];
  onBookingClick?: (booking: Booking) => void;
}

const HOUR_START = 6;
const HOUR_END = 22;

const BOOKING_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f97316',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#eab308',
  '#ef4444',
];

function getHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export function CalendarDayView({
  date,
  bookings,
  resources,
  onBookingClick,
}: CalendarDayViewProps) {
  const dateStr = format(date, 'yyyy-MM-dd');

  const dayBookings = useMemo(
    () => bookings.filter((b) => b.date === dateStr),
    [bookings, dateStr]
  );

  const hours = useMemo(() => {
    const result: number[] = [];
    for (let h = HOUR_START; h <= HOUR_END; h++) {
      result.push(h);
    }
    return result;
  }, []);

  const resourceColumns = useMemo(() => {
    if (resources.length === 0) {
      return [{ id: 'all', name: 'All Bookings' }];
    }
    return resources.map((r) => ({ id: r.id, name: r.name }));
  }, [resources]);

  const vendorColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const uniqueVendors = Array.from(
      new Set(dayBookings.map((b) => b.userId))
    );
    uniqueVendors.forEach((id, idx) => {
      map[id] = BOOKING_COLORS[idx % BOOKING_COLORS.length];
    });
    return map;
  }, [dayBookings]);

  const totalHours = HOUR_END - HOUR_START;
  const hourHeight = 60; // px per hour

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {format(date, 'EEEE, MMMM d, yyyy')}
        </h3>
        <span className="text-sm text-gray-500">
          {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Timeline */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <div className="min-w-[600px]">
          {/* Column headers */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <div className="w-16 flex-shrink-0 border-r border-gray-200 p-2 text-xs font-medium text-gray-500">
              Time
            </div>
            {resourceColumns.map((col) => (
              <div
                key={col.id}
                className="flex-1 border-r border-gray-200 p-2 text-xs font-medium text-gray-500 text-center capitalize last:border-r-0"
              >
                {col.name}
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="flex">
            {/* Hour labels */}
            <div className="w-16 flex-shrink-0 border-r border-gray-200">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="flex items-start border-b border-gray-100 text-[10px] text-gray-400 px-2 pt-1"
                  style={{ height: hourHeight }}
                >
                  {getHourLabel(hour)}
                </div>
              ))}
            </div>

            {/* Resource columns */}
            {resourceColumns.map((col) => {
              const columnBookings =
                col.id === 'all'
                  ? dayBookings
                  : dayBookings.filter((b) =>
                      b.resources.some((r) => r.resourceId === col.id)
                    );

              return (
                <div
                  key={col.id}
                  className="flex-1 relative border-r border-gray-200 last:border-r-0"
                  style={{ height: totalHours * hourHeight }}
                >
                  {/* Hour grid lines */}
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="absolute w-full border-b border-gray-100"
                      style={{ top: (hour - HOUR_START) * hourHeight + hourHeight }}
                    />
                  ))}

                  {/* Booking blocks */}
                  {columnBookings.map((booking) => {
                    const startParts = booking.startTime.split(':');
                    const endParts = booking.endTime.split(':');
                    const startDecimal =
                      parseInt(startParts[0], 10) +
                      parseInt(startParts[1], 10) / 60;
                    const endDecimal =
                      parseInt(endParts[0], 10) +
                      parseInt(endParts[1], 10) / 60;

                    const top = (startDecimal - HOUR_START) * hourHeight;
                    const height = (endDecimal - startDecimal) * hourHeight;

                    return (
                      <div
                        key={booking.id}
                        className="absolute left-1 right-1"
                        style={{ top, height: Math.max(height, 20) }}
                      >
                        <BookingBlock
                          booking={booking}
                          color={vendorColorMap[booking.userId] || '#6b7280'}
                          onClick={() => onBookingClick?.(booking)}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
