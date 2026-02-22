'use client';

import React, { useMemo } from 'react';
import {
  LayoutGrid,
  Refrigerator,
  Snowflake,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Timer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import type { Booking, Resource } from '@/lib/types';

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
}

interface ControlTowerDashboardProps {
  bookings: Booking[];
  resources: Resource[];
  alerts?: Alert[];
}

const statusColorMap: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-800',
  checked_in: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-orange-100 text-orange-800',
};

const alertTypeStyles: Record<string, string> = {
  warning: 'border-l-yellow-500 bg-yellow-50',
  error: 'border-l-red-500 bg-red-50',
  info: 'border-l-blue-500 bg-blue-50',
};

export function ControlTowerDashboard({
  bookings,
  resources,
  alerts = [],
}: ControlTowerDashboardProps) {
  const metrics = useMemo(() => {
    const tablesInUse = resources.filter(
      (r) => r.typeName === 'table' && r.status === 'in_use'
    ).length;
    const totalTables = resources.filter((r) => r.typeName === 'table').length;

    const fridgesInUse = resources.filter(
      (r) => r.typeName === 'fridge' && r.status === 'in_use'
    ).length;
    const totalFridges = resources.filter((r) => r.typeName === 'fridge').length;

    const freezersInUse = resources.filter(
      (r) => r.typeName === 'freezer' && r.status === 'in_use'
    ).length;
    const totalFreezers = resources.filter(
      (r) => r.typeName === 'freezer'
    ).length;

    const activeVendors = new Set(
      bookings
        .filter((b) => b.status === 'checked_in')
        .map((b) => b.userId)
    ).size;

    return { tablesInUse, totalTables, fridgesInUse, totalFridges, freezersInUse, totalFreezers, activeVendors };
  }, [bookings, resources]);

  const todayBookings = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return bookings.filter((b) => b.date === today);
  }, [bookings]);

  const timelineHours = useMemo(() => {
    const hours: string[] = [];
    for (let h = 6; h <= 22; h++) {
      hours.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return hours;
  }, []);

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <LayoutGrid className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tables in Use</p>
              <p className="text-2xl font-bold">
                {metrics.tablesInUse}
                <span className="text-sm font-normal text-gray-400">
                  /{metrics.totalTables}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <Refrigerator className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Fridges in Use</p>
              <p className="text-2xl font-bold">
                {metrics.fridgesInUse}
                <span className="text-sm font-normal text-gray-400">
                  /{metrics.totalFridges}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <Snowflake className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Freezers in Use</p>
              <p className="text-2xl font-bold">
                {metrics.freezersInUse}
                <span className="text-sm font-normal text-gray-400">
                  /{metrics.totalFreezers}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Vendors</p>
              <p className="text-2xl font-bold">{metrics.activeVendors}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Current Bookings List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Today&apos;s Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {todayBookings.length === 0 ? (
              <p className="text-sm text-gray-500">No bookings for today.</p>
            ) : (
              <div className="space-y-3">
                {todayBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {booking.status === 'checked_in' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {booking.status === 'confirmed' && (
                          <Clock className="h-4 w-4 text-blue-500" />
                        )}
                        {booking.status === 'cancelled' && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        {booking.status === 'pending' && (
                          <Timer className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {booking.businessName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {booking.startTime} - {booking.endTime}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        'capitalize',
                        statusColorMap[booking.status] || 'bg-gray-100 text-gray-800'
                      )}
                    >
                      {booking.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-500">No active alerts.</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      'rounded-lg border-l-4 p-3',
                      alertTypeStyles[alert.type] || 'border-l-gray-500 bg-gray-50'
                    )}
                  >
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-gray-500">{alert.timestamp}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today&apos;s Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Hour labels */}
              <div className="flex border-b border-gray-200 pb-2">
                <div className="w-32 flex-shrink-0 text-xs font-medium text-gray-500">
                  Vendor
                </div>
                {timelineHours.map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 text-center text-xs text-gray-400"
                  >
                    {hour}
                  </div>
                ))}
              </div>

              {/* Booking rows */}
              {todayBookings.map((booking) => {
                const startHour = parseInt(booking.startTime.split(':')[0], 10);
                const endHour = parseInt(booking.endTime.split(':')[0], 10);
                const startOffset =
                  ((startHour - 6) / (22 - 6)) * 100;
                const width =
                  ((endHour - startHour) / (22 - 6)) * 100;

                return (
                  <div
                    key={booking.id}
                    className="flex items-center border-b border-gray-100 py-2"
                  >
                    <div className="w-32 flex-shrink-0 truncate text-xs font-medium">
                      {booking.businessName}
                    </div>
                    <div className="relative flex-1 h-8">
                      <div
                        className={cn(
                          'absolute top-0 h-full rounded-md px-2 flex items-center text-xs text-white',
                          booking.status === 'checked_in'
                            ? 'bg-green-500'
                            : booking.status === 'confirmed'
                            ? 'bg-blue-500'
                            : 'bg-gray-400'
                        )}
                        style={{
                          left: `${startOffset}%`,
                          width: `${width}%`,
                        }}
                      >
                        <span className="truncate">
                          {booking.startTime}-{booking.endTime}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {todayBookings.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-gray-400">
                    No bookings to display on the timeline.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
