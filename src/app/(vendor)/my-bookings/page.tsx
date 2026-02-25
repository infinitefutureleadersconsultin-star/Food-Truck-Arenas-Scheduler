'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Edit3,
  XCircle,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUserBookings } from '@/lib/hooks/useBookings';
import { cancelBooking, updateBooking } from '@/lib/services/bookingService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils/cn';
import { formatDate, formatTime } from '@/lib/utils/dateUtils';
import type { Booking, BookingStatus } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const RESOURCE_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'table', label: 'Tables' },
  { value: 'fridge', label: 'Fridges' },
  { value: 'freezer', label: 'Freezers' },
  { value: 'storage', label: 'Storage' },
];

// ---------------------------------------------------------------------------
// My Bookings Page
// ---------------------------------------------------------------------------

export default function MyBookingsPage() {
  const { user } = useAuthContext();
  const { bookings, loading, error, refetch } = useUserBookings();

  // Tab state
  const [activeTab, setActiveTab] = useState<string>('upcoming');

  // Filters
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Cancel dialog
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Edit dialog (placeholder - opens a simple notes editor)
  const [editTarget, setEditTarget] = useState<Booking | null>(null);

  const today = new Date().toISOString().split('T')[0];

  // Filtered bookings per tab
  const filteredBookings = useMemo(() => {
    let list: Booking[];

    switch (activeTab) {
      case 'upcoming':
        list = bookings.filter(
          (b) =>
            b.date >= today &&
            b.status !== 'cancelled' &&
            b.status !== 'completed' &&
            b.status !== 'no_show',
        );
        list.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
        break;
      case 'past':
        list = bookings.filter(
          (b) =>
            (b.date < today || b.status === 'completed') &&
            b.status !== 'cancelled',
        );
        list.sort((a, b) => b.date.localeCompare(a.date));
        break;
      case 'cancelled':
        list = bookings.filter((b) => b.status === 'cancelled');
        list.sort((a, b) => b.date.localeCompare(a.date));
        break;
      case 'recurring':
        list = bookings.filter((b) => b.isRecurring);
        list.sort((a, b) => a.date.localeCompare(b.date));
        break;
      default:
        list = bookings;
    }

    // Apply extra filters
    if (dateRange.from) {
      list = list.filter((b) => b.date >= dateRange.from);
    }
    if (dateRange.to) {
      list = list.filter((b) => b.date <= dateRange.to);
    }
    if (statusFilter !== 'all') {
      list = list.filter((b) => b.status === statusFilter);
    }
    if (resourceTypeFilter !== 'all') {
      list = list.filter((b) =>
        b.resources.some((r) =>
          r.resourceTypeName.toLowerCase().includes(resourceTypeFilter),
        ),
      );
    }

    return list;
  }, [bookings, activeTab, today, dateRange, statusFilter, resourceTypeFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBookings.slice(start, start + PAGE_SIZE);
  }, [filteredBookings, currentPage]);

  // Reset page when filters change
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  }, []);

  // Cancel handler
  const handleCancel = useCallback(async () => {
    if (!cancelTarget || !user) return;
    setCancelLoading(true);
    try {
      await cancelBooking(cancelTarget.id, user.uid, cancelReason || 'Cancelled by vendor');
      setCancelTarget(null);
      setCancelReason('');
      refetch();
    } catch (err) {
      console.error('Failed to cancel booking:', err);
    } finally {
      setCancelLoading(false);
    }
  }, [cancelTarget, cancelReason, user, refetch]);

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
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all your commissary bookings.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Filters bar */}
      {showFilters && (
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
            <DateRangePicker
              from={dateRange.from}
              to={dateRange.to}
              onChange={setDateRange}
            />
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="checked_in">Checked In</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Resource Type</Label>
              <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateRange({ from: '', to: '' });
                setStatusFilter('all');
                setResourceTypeFilter('all');
              }}
            >
              Clear
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
        </TabsList>

        {['upcoming', 'past', 'cancelled', 'recurring'].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {paginatedBookings.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No bookings"
                description={
                  tab === 'upcoming'
                    ? 'You have no upcoming bookings.'
                    : tab === 'past'
                      ? 'You have no past bookings.'
                      : tab === 'cancelled'
                        ? 'No cancelled bookings.'
                        : 'No recurring bookings.'
                }
                action={
                  tab === 'upcoming'
                    ? {
                        label: 'Book a Table',
                        onClick: () => {
                          window.location.href = '/book';
                        },
                      }
                    : undefined
                }
              />
            ) : (
              <div className="space-y-3">
                {paginatedBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onEdit={() => setEditTarget(booking)}
                    onCancel={() => setCancelTarget(booking)}
                    onRebook={() => {
                      window.location.href = '/book';
                    }}
                    showActions={tab !== 'past'}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Pagination */}
      {filteredBookings.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}-
            {Math.min(currentPage * PAGE_SIZE, filteredBookings.length)} of{' '}
            {filteredBookings.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-700">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {cancelTarget && (
        <Dialog open onOpenChange={() => setCancelTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Booking</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel your booking on{' '}
                {formatDate(cancelTarget.date, 'MMM d, yyyy')} at{' '}
                {formatTime(cancelTarget.startTime)}?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Reason (optional)</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Why are you cancelling?"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={cancelLoading}>
                Keep Booking
              </Button>
              <Button variant="destructive" onClick={handleCancel} disabled={cancelLoading}>
                {cancelLoading ? 'Cancelling...' : 'Cancel Booking'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editTarget && (
        <EditBookingDialog
          booking={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Booking Card
// ---------------------------------------------------------------------------

interface BookingCardProps {
  booking: Booking;
  onEdit: () => void;
  onCancel: () => void;
  onRebook: () => void;
  showActions: boolean;
}

function BookingCard({
  booking,
  onEdit,
  onCancel,
  onRebook,
  showActions,
}: BookingCardProps) {
  const resourceSummary = booking.resources
    .map((r) => r.resourceName)
    .join(', ');

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">
              {formatDate(booking.date, 'EEE, MMM d, yyyy')}
            </span>
            <StatusBadge status={booking.status} type="booking" />
            {booking.isRecurring && (
              <Badge variant="info">
                <RefreshCw className="mr-1 h-3 w-3" />
                Recurring
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
          </p>
          {resourceSummary && (
            <p className="text-xs text-gray-500">Resources: {resourceSummary}</p>
          )}
        </div>

        {showActions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {(booking.status === 'pending' || booking.status === 'confirmed') && (
              <>
                <Button size="sm" variant="outline" onClick={onEdit}>
                  <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={onCancel}>
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  Cancel
                </Button>
              </>
            )}
            {booking.status === 'cancelled' && (
              <Button size="sm" variant="outline" onClick={onRebook}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Rebook
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Edit Booking Dialog
// ---------------------------------------------------------------------------

interface EditBookingDialogProps {
  booking: Booking;
  onClose: () => void;
  onSaved: () => void;
}

function EditBookingDialog({ booking, onClose, onSaved }: EditBookingDialogProps) {
  const [editDate, setEditDate] = useState(booking.date);
  const [editStart, setEditStart] = useState(booking.startTime);
  const [editEnd, setEditEnd] = useState(booking.endTime);
  const [editNotes, setEditNotes] = useState(booking.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateBooking(booking.id, {
        date: editDate,
        startTime: editStart,
        endTime: editEnd,
        notes: editNotes,
      });
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update booking.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
          <DialogDescription>
            Editing booking for {formatDate(booking.date, 'MMM d, yyyy')} at{' '}
            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="time"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="mt-1"
            />
          </div>
          {saveError && (
            <p className="text-sm text-red-600">{saveError}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
