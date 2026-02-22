'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  Megaphone,
  CalendarPlus,
  Eye,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUserBookings } from '@/lib/hooks/useBookings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils/cn';
import { formatDate, formatTime } from '@/lib/utils/dateUtils';
import type { Booking, Announcement } from '@/lib/types';

// ---------------------------------------------------------------------------
// Hooks for announcements (local stub -- wired to context when available)
// ---------------------------------------------------------------------------

function useAnnouncements() {
  // Placeholder: in production this would subscribe to Firestore.
  // Returns an empty array so the page renders cleanly before data is wired.
  return {
    announcements: [] as Announcement[],
    loading: false,
    error: null as string | null,
  };
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'success';
}

function StatCard({ title, value, subtitle, icon, variant = 'default' }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
            variant === 'warning' && 'bg-yellow-100 text-yellow-700',
            variant === 'success' && 'bg-green-100 text-green-700',
            variant === 'default' && 'bg-blue-100 text-blue-700',
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="truncate text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="truncate text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function VendorDashboardPage() {
  const { userData, loading: authLoading } = useAuthContext();
  const { bookings, loading: bookingsLoading, error: bookingsError } = useUserBookings();
  const { announcements, loading: announcementsLoading } = useAnnouncements();

  // Derived data
  const today = new Date().toISOString().split('T')[0];

  const upcomingBookings = useMemo(() => {
    return bookings
      .filter(
        (b) =>
          b.date >= today &&
          b.status !== 'cancelled' &&
          b.status !== 'completed' &&
          b.status !== 'no_show',
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .slice(0, 5);
  }, [bookings, today]);

  const nextBooking = upcomingBookings[0] ?? null;

  const bookingsThisWeek = useMemo(() => {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    return bookings.filter(
      (b) =>
        b.date >= today &&
        b.date <= weekEndStr &&
        b.status !== 'cancelled' &&
        b.status !== 'no_show',
    ).length;
  }, [bookings, today]);

  const documentWarnings = useMemo(() => {
    if (!userData) return 0;
    return (userData.documents ?? []).filter(
      (d) => d.status === 'expiring_soon' || d.status === 'expired',
    ).length;
  }, [userData]);

  const recentAnnouncements = useMemo(() => {
    return [...announcements]
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      })
      .slice(0, 3);
  }, [announcements]);

  // Loading state
  if (authLoading || bookingsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (bookingsError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500" />
            <p className="text-sm text-gray-600">
              Failed to load bookings: {bookingsError}
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {userData?.businessName ?? 'Vendor'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here is an overview of your commissary activity.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Next Booking"
          value={
            nextBooking
              ? formatDate(nextBooking.date, 'MMM d')
              : 'None'
          }
          subtitle={
            nextBooking
              ? formatTime(nextBooking.startTime) + ' - ' + formatTime(nextBooking.endTime)
              : 'No upcoming bookings'
          }
          icon={<CalendarDays className="h-6 w-6" />}
          variant="default"
        />
        <StatCard
          title="Bookings This Week"
          value={String(bookingsThisWeek)}
          subtitle="confirmed & pending"
          icon={<Clock className="h-6 w-6" />}
          variant="success"
        />
        <StatCard
          title="Document Status"
          value={documentWarnings > 0 ? `${documentWarnings} warning${documentWarnings > 1 ? 's' : ''}` : 'All good'}
          subtitle={
            documentWarnings > 0
              ? 'Action required'
              : 'Documents up to date'
          }
          icon={<AlertTriangle className="h-6 w-6" />}
          variant={documentWarnings > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Upcoming Bookings */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Upcoming Bookings</CardTitle>
          <Link href="/my-bookings">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming bookings"
              description="You do not have any upcoming bookings scheduled."
              action={{
                label: 'Book a Table',
                onClick: () => {
                  window.location.href = '/book';
                },
              }}
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {upcomingBookings.map((booking) => (
                <BookingRow key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Announcements */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Recent Announcements</CardTitle>
          <Link href="/announcements">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {announcementsLoading ? (
            <LoadingSpinner className="py-8" />
          ) : recentAnnouncements.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No announcements"
              description="There are no announcements at this time."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {recentAnnouncements.map((a) => (
                <div key={a.id} className="flex items-start gap-3 py-3">
                  <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {a.title}
                      </p>
                      <Badge
                        variant={
                          a.priority === 'urgent'
                            ? 'destructive'
                            : a.priority === 'high'
                              ? 'warning'
                              : 'secondary'
                        }
                      >
                        {a.type}
                      </Badge>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                      {a.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/book">
          <Button size="lg">
            <CalendarPlus className="mr-2 h-5 w-5" />
            Book a Table
          </Button>
        </Link>
        <Link href="/calendar">
          <Button variant="outline" size="lg">
            <Eye className="mr-2 h-5 w-5" />
            View Calendar
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Booking Row
// ---------------------------------------------------------------------------

interface BookingRowProps {
  booking: Booking;
}

function BookingRow({ booking }: BookingRowProps) {
  const resourceSummary = booking.resources
    .map((r) => r.resourceTypeName)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ');

  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">
            {formatDate(booking.date, 'EEE, MMM d')}
          </p>
          <StatusBadge status={booking.status} type="booking" />
        </div>
        <p className="mt-0.5 text-xs text-gray-500">
          {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
          {resourceSummary && ` | ${resourceSummary}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {booking.status === 'confirmed' && booking.date === new Date().toISOString().split('T')[0] && (
          <Link href="/check-in">
            <Button size="sm" variant="default">
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Check In
            </Button>
          </Link>
        )}
        {(booking.status === 'pending' || booking.status === 'confirmed') && (
          <Link href={`/my-bookings?cancel=${booking.id}`}>
            <Button size="sm" variant="outline">
              <XCircle className="mr-1.5 h-3.5 w-3.5" />
              Cancel
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
