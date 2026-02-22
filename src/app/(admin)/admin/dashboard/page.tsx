'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Table2,
  Refrigerator,
  Snowflake,
  Users,
  AlertTriangle,
  Clock,
  Plus,
  Megaphone,
  Eye,
  Download,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { cn } from '@/lib/utils/cn';
import { useTodaysBookings } from '@/lib/hooks/useBookings';
import { useResourceTypes } from '@/lib/hooks/useResourceTypes';
import { useResources } from '@/lib/hooks/useResources';
import { formatTime } from '@/lib/utils/dateUtils';
import type { Booking, Resource, ResourceType } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCheckInStatusDisplay(booking: Booking): {
  label: string;
  color: string;
} {
  const now = new Date();
  const [hours, minutes] = booking.startTime.split(':').map(Number);
  const [year, month, day] = booking.date.split('-').map(Number);
  const startDate = new Date(year, month - 1, day, hours, minutes);

  if (booking.status === 'checked_in') {
    return { label: 'Checked In', color: 'bg-green-100 text-green-800' };
  }

  if (booking.status === 'no_show') {
    return { label: 'NO-SHOW', color: 'bg-red-100 text-red-800' };
  }

  if (booking.status === 'completed') {
    return { label: 'Completed', color: 'bg-gray-100 text-gray-700' };
  }

  if (booking.status === 'cancelled') {
    return { label: 'Cancelled', color: 'bg-gray-100 text-gray-500' };
  }

  // Check if late
  if (now > startDate && (booking.status === 'confirmed' || booking.status === 'pending')) {
    const lateMinutes = Math.floor((now.getTime() - startDate.getTime()) / 60000);
    if (lateMinutes > 30) {
      return {
        label: `NO-SHOW`,
        color: 'bg-red-100 text-red-800',
      };
    }
    return {
      label: `LATE ${lateMinutes}m`,
      color: 'bg-yellow-100 text-yellow-800',
    };
  }

  return { label: 'Upcoming', color: 'bg-gray-100 text-gray-600' };
}

function getResourcesInUse(
  bookings: Booking[],
  resourceTypeSlug: string
): number {
  const now = new Date();
  return bookings.filter((b) => {
    if (b.status !== 'checked_in') return false;
    return b.resources.some(
      (r) =>
        r.resourceTypeName.toLowerCase().includes(resourceTypeSlug) ||
        r.resourceTypeId.includes(resourceTypeSlug)
    );
  }).length;
}

function getActiveVendorCount(bookings: Booking[]): number {
  const activeStatuses = ['confirmed', 'checked_in', 'pending'];
  const vendorIds = new Set(
    bookings.filter((b) => activeStatuses.includes(b.status)).map((b) => b.userId)
  );
  return vendorIds.size;
}

// ---------------------------------------------------------------------------
// Alerts generator
// ---------------------------------------------------------------------------

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
}

function generateAlerts(bookings: Booking[]): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();

  bookings.forEach((b) => {
    if (b.status === 'confirmed' || b.status === 'pending') {
      const [hours, minutes] = b.startTime.split(':').map(Number);
      const [year, month, day] = b.date.split('-').map(Number);
      const startDate = new Date(year, month - 1, day, hours, minutes);

      if (now > startDate) {
        const lateMinutes = Math.floor(
          (now.getTime() - startDate.getTime()) / 60000
        );
        if (lateMinutes > 30) {
          alerts.push({
            id: `noshow-${b.id}`,
            type: 'error',
            message: `${b.businessName || b.userName} is a no-show (${lateMinutes}m late)`,
          });
        } else if (lateMinutes > 5) {
          alerts.push({
            id: `late-${b.id}`,
            type: 'warning',
            message: `${b.businessName || b.userName} is ${lateMinutes} minutes late`,
          });
        }
      }
    }
  });

  return alerts;
}

// ---------------------------------------------------------------------------
// Timeline helpers
// ---------------------------------------------------------------------------

const TIMELINE_START = 6; // 6 AM
const TIMELINE_END = 22; // 10 PM
const TIMELINE_HOURS = TIMELINE_END - TIMELINE_START;

function getBookingPosition(booking: Booking): { left: string; width: string } {
  const [startH, startM] = booking.startTime.split(':').map(Number);
  const [endH, endM] = booking.endTime.split(':').map(Number);

  const startMinutes = startH * 60 + startM - TIMELINE_START * 60;
  const endMinutes = endH * 60 + endM - TIMELINE_START * 60;
  const totalMinutes = TIMELINE_HOURS * 60;

  const left = Math.max(0, (startMinutes / totalMinutes) * 100);
  const width = Math.max(2, ((endMinutes - startMinutes) / totalMinutes) * 100);

  return {
    left: `${left}%`,
    width: `${Math.min(width, 100 - left)}%`,
  };
}

const BOOKING_COLORS = [
  'bg-blue-400',
  'bg-green-400',
  'bg-purple-400',
  'bg-orange-400',
  'bg-pink-400',
  'bg-teal-400',
  'bg-indigo-400',
  'bg-amber-400',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const todayStr = new Date().toISOString().split('T')[0];
  const { bookings, loading: bookingsLoading, error: bookingsError } = useTodaysBookings(todayStr);
  const { resourceTypes, loading: typesLoading } = useResourceTypes();
  const { resources, loading: resourcesLoading } = useResources();

  const loading = bookingsLoading || typesLoading || resourcesLoading;

  // Stats
  const tablesTotal = useMemo(
    () => resourceTypes.find((rt) => rt.slug === 'tables')?.totalQuantity ?? 8,
    [resourceTypes]
  );
  const fridgesTotal = useMemo(
    () => resourceTypes.find((rt) => rt.slug === 'fridges')?.totalQuantity ?? 5,
    [resourceTypes]
  );
  const freezersTotal = useMemo(
    () => resourceTypes.find((rt) => rt.slug === 'freezers')?.totalQuantity ?? 2,
    [resourceTypes]
  );

  const tablesInUse = useMemo(
    () => getResourcesInUse(bookings, 'table'),
    [bookings]
  );
  const fridgesInUse = useMemo(
    () => getResourcesInUse(bookings, 'fridge'),
    [bookings]
  );
  const freezersInUse = useMemo(
    () => getResourcesInUse(bookings, 'freezer'),
    [bookings]
  );
  const activeVendors = useMemo(
    () => getActiveVendorCount(bookings),
    [bookings]
  );

  const alerts = useMemo(() => generateAlerts(bookings), [bookings]);

  // Build a vendor-to-color map for the timeline
  const vendorColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    const uniqueVendors = Array.from(new Set(bookings.map((b) => b.userId)));
    uniqueVendors.forEach((id, i) => {
      map[id] = BOOKING_COLORS[i % BOOKING_COLORS.length];
    });
    return map;
  }, [bookings]);

  // Get unique resource names for the timeline
  const timelineResources = useMemo(() => {
    const names = new Set<string>();
    bookings.forEach((b) => {
      b.resources.forEach((r) => names.add(r.resourceName));
    });
    return Array.from(names).sort();
  }, [bookings]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (bookingsError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-red-600">Error loading dashboard: {bookingsError}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Commissary Control Tower
          </h1>
          <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </span>
            <span className="text-sm font-medium text-green-700">Live</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Tables in Use
            </CardTitle>
            <Table2 className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tablesInUse}
              <span className="text-lg font-normal text-gray-400">
                /{tablesTotal}
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all"
                style={{
                  width: `${(tablesInUse / tablesTotal) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Fridges in Use
            </CardTitle>
            <Refrigerator className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fridgesInUse}
              <span className="text-lg font-normal text-gray-400">
                /{fridgesTotal}
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-green-500 transition-all"
                style={{
                  width: `${(fridgesInUse / fridgesTotal) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Freezers in Use
            </CardTitle>
            <Snowflake className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {freezersInUse}
              <span className="text-lg font-normal text-gray-400">
                /{freezersTotal}
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-indigo-500 transition-all"
                style={{
                  width: `${(freezersInUse / freezersTotal) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Active Vendors
            </CardTitle>
            <Users className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeVendors}</div>
            <p className="mt-1 text-xs text-gray-500">
              {bookings.filter((b) => b.status === 'checked_in').length} currently
              checked in
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Right Now Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-lg">Right Now</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No bookings scheduled for today.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Resources</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => {
                  const status = getCheckInStatusDisplay(booking);
                  return (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {booking.businessName || booking.userName}
                      </TableCell>
                      <TableCell>
                        {formatTime(booking.startTime)} -{' '}
                        {formatTime(booking.endTime)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {booking.resources.map((r, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {r.resourceName}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            status.color
                          )}
                        >
                          {status.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Today's Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today&apos;s Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timelineResources.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No resource allocations to display.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Time axis */}
              <div className="ml-32 flex justify-between text-xs text-gray-400">
                {Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => {
                  const hour = TIMELINE_START + i;
                  const ampm = hour >= 12 ? 'PM' : 'AM';
                  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                  return (
                    <span key={hour}>
                      {display}
                      {ampm}
                    </span>
                  );
                })}
              </div>

              {/* Resource rows */}
              {timelineResources.map((resourceName) => {
                const resourceBookings = bookings.filter((b) =>
                  b.resources.some((r) => r.resourceName === resourceName)
                );
                return (
                  <div key={resourceName} className="flex items-center gap-2">
                    <div className="w-32 truncate text-right text-sm font-medium text-gray-600">
                      {resourceName}
                    </div>
                    <div className="relative h-8 flex-1 rounded bg-gray-50">
                      {resourceBookings.map((booking) => {
                        const pos = getBookingPosition(booking);
                        return (
                          <div
                            key={booking.id}
                            className={cn(
                              'absolute top-1 h-6 rounded px-1 text-xs leading-6 text-white truncate',
                              vendorColorMap[booking.userId] ?? 'bg-blue-400'
                            )}
                            style={{
                              left: pos.left,
                              width: pos.width,
                            }}
                            title={`${booking.businessName || booking.userName}: ${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`}
                          >
                            {booking.businessName || booking.userName}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-lg">Alerts</CardTitle>
              <Badge variant="destructive" className="ml-2">
                {alerts.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm',
                    alert.type === 'error' &&
                      'border-red-200 bg-red-50 text-red-800',
                    alert.type === 'warning' &&
                      'border-yellow-200 bg-yellow-50 text-yellow-800',
                    alert.type === 'info' &&
                      'border-blue-200 bg-blue-50 text-blue-800'
                  )}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {alert.message}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => router.push('/admin/bookings')}>
              <Plus className="mr-2 h-4 w-4" />
              Force Add Booking
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/admin/communications')}
            >
              <Megaphone className="mr-2 h-4 w-4" />
              Send Announcement
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/admin/vendors')}
            >
              <Eye className="mr-2 h-4 w-4" />
              View All Vendors
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
