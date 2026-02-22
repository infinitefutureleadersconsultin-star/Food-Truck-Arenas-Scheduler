'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Info,
  Clock,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTodaysBookings } from '@/lib/hooks/useBookings';
import { useResources } from '@/lib/hooks/useResources';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils/cn';
import { formatDate, formatTime } from '@/lib/utils/dateUtils';
import type { Booking, Resource } from '@/lib/types';

// ---------------------------------------------------------------------------
// FloorPlanView placeholder -- uses the real component when available
// ---------------------------------------------------------------------------

let FloorPlanView: React.ComponentType<{ date: string }>;
try {
  // Dynamic import at module level won't work in a try/catch.
  // Instead we define a lazy fallback that gets replaced by the import below.
  FloorPlanView = ({ date }: { date: string }) => (
    <div className="flex min-h-[400px] items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400">
      <div className="text-center">
        <CalendarIcon className="mx-auto mb-2 h-10 w-10" />
        <p className="text-sm font-medium">Floor Plan View</p>
        <p className="text-xs">Interactive floor plan for {formatDate(date, 'MMM d, yyyy')}</p>
      </div>
    </div>
  );
} catch {
  // keep fallback
}

// Attempt to pull in the real component (no-op if not yet built)
try {
  const mod = require('@/components/booking/FloorPlanView');
  if (mod?.FloorPlanView) FloorPlanView = mod.FloorPlanView;
  else if (mod?.default) FloorPlanView = mod.default;
} catch {
  // keep fallback
}

// ---------------------------------------------------------------------------
// Book Page
// ---------------------------------------------------------------------------

export default function BookPage() {
  const { userData } = useAuthContext();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );

  const { bookings, loading: bookingsLoading } = useTodaysBookings(selectedDate);
  const { resources, loading: resourcesLoading } = useResources();

  // Capacity summary
  const capacitySummary = useMemo(() => {
    const totalResources = resources.length;
    const bookedIds = new Set<string>();
    bookings.forEach((b) => {
      if (['pending', 'confirmed', 'checked_in'].includes(b.status)) {
        b.resources.forEach((r) => bookedIds.add(r.resourceId));
      }
    });
    const bookedCount = bookedIds.size;
    const available = totalResources - bookedCount;
    return { totalResources, bookedCount, available };
  }, [resources, bookings]);

  // Resource availability grouped by type
  const resourcesByType = useMemo(() => {
    const map = new Map<string, { typeName: string; total: number; booked: number }>();

    resources.forEach((r) => {
      if (!map.has(r.typeId)) {
        map.set(r.typeId, { typeName: r.typeName, total: 0, booked: 0 });
      }
      const entry = map.get(r.typeId)!;
      entry.total += 1;
    });

    const bookedIds = new Set<string>();
    bookings.forEach((b) => {
      if (['pending', 'confirmed', 'checked_in'].includes(b.status)) {
        b.resources.forEach((br) => {
          bookedIds.add(br.resourceId);
          const entry = map.get(br.resourceTypeId);
          if (entry) entry.booked += 1;
        });
      }
    });

    return Array.from(map.entries()).map(([id, data]) => ({
      typeId: id,
      ...data,
      available: data.total - data.booked,
    }));
  }, [resources, bookings]);

  // Date navigation helpers
  function shiftDate(days: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  }

  const isLoading = bookingsLoading || resourcesLoading;

  return (
    <div className="flex flex-col lg:flex-row">
      {/* Main content area */}
      <div className="flex-1 space-y-4 p-4 md:p-6">
        {/* Top bar: date selector + capacity */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shiftDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-44"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => shiftDate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setSelectedDate(new Date().toISOString().split('T')[0])
              }
            >
              Today
            </Button>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>
              <strong>{capacitySummary.available}</strong> of{' '}
              {capacitySummary.totalResources} resources available
            </span>
          </div>
        </div>

        {/* Floor Plan Hero */}
        {isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <FloorPlanView date={selectedDate} />
        )}
      </div>

      {/* Sidebar (desktop) / bottom sheet-like section (mobile) */}
      <aside className="w-full border-t border-gray-200 lg:w-80 lg:border-l lg:border-t-0">
        <div className="space-y-4 p-4">
          {/* Resource Availability */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-4 w-4" />
                Resource Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resourcesLoading ? (
                <LoadingSpinner className="py-4" />
              ) : resourcesByType.length === 0 ? (
                <p className="text-sm text-gray-500">No resources configured.</p>
              ) : (
                <div className="space-y-3">
                  {resourcesByType.map((rt) => (
                    <div key={rt.typeId} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{rt.typeName}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={rt.available > 0 ? 'success' : 'destructive'}
                        >
                          {rt.available} / {rt.total}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Bookings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Bookings on {formatDate(selectedDate, 'MMM d')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? (
                <LoadingSpinner className="py-4" />
              ) : bookings.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No bookings for this date.
                </p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {bookings
                    .filter((b) => b.status !== 'cancelled' && b.status !== 'no_show')
                    .map((b) => (
                      <div
                        key={b.id}
                        className="rounded-lg border border-gray-100 bg-gray-50 p-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-900">
                            {b.businessName}
                          </span>
                          <StatusBadge status={b.status} type="booking" />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatTime(b.startTime)} - {formatTime(b.endTime)}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {b.resources.map((r) => r.resourceName).join(', ')}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </aside>
    </div>
  );
}
