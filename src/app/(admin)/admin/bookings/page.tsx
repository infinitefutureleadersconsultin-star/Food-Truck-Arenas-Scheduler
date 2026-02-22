'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  X,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Pagination } from '@/components/shared/Pagination';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils/cn';
import { useBookings } from '@/lib/hooks/useBookings';
import { cancelBooking, updateBooking } from '@/lib/services/bookingService';
import { formatDate, formatTime } from '@/lib/utils/dateUtils';
import type { Booking, BookingStatus } from '@/lib/types';

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

export default function BookingsPage() {
  const router = useRouter();
  const { bookings, loading, error, refetch } = useBookings();

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);

  // Dialogs
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    // Search filter
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.userName.toLowerCase().includes(lowerSearch) ||
          b.businessName.toLowerCase().includes(lowerSearch) ||
          b.id.toLowerCase().includes(lowerSearch)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    // Date range filter
    if (dateRange.from) {
      filtered = filtered.filter((b) => b.date >= dateRange.from);
    }
    if (dateRange.to) {
      filtered = filtered.filter((b) => b.date <= dateRange.to);
    }

    return filtered;
  }, [bookings, search, statusFilter, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBookings, currentPage]);

  // Reset page when filters change
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handleDateRangeChange = useCallback(
    (range: { from: string; to: string }) => {
      setDateRange(range);
      setCurrentPage(1);
    },
    []
  );

  // Actions
  const handleCancel = useCallback(
    async () => {
      if (!selectedBooking) return;
      setActionLoading(true);
      try {
        await cancelBooking(selectedBooking.id, 'admin', 'Cancelled by admin');
        setCancelDialogOpen(false);
        setSelectedBooking(null);
        refetch();
      } catch (err) {
        console.error('Failed to cancel booking:', err);
      } finally {
        setActionLoading(false);
      }
    },
    [selectedBooking, refetch]
  );

  const handleForceOverride = useCallback(
    async (booking: Booking) => {
      setActionLoading(true);
      try {
        await updateBooking(booking.id, { status: 'confirmed' });
        refetch();
      } catch (err) {
        console.error('Failed to override booking:', err);
      } finally {
        setActionLoading(false);
      }
    },
    [refetch]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-red-600">Error loading bookings: {error}</p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
        <Button onClick={() => router.push('/admin/calendar')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Booking
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by vendor name or booking ID..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full lg:w-48">
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DateRangePicker
              from={dateRange.from}
              to={dateRange.to}
              onChange={handleDateRangeChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredBookings.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No bookings found"
              description="No bookings match your current filters. Try adjusting your search criteria."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Resources</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(booking.date)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatTime(booking.startTime)} -{' '}
                        {formatTime(booking.endTime)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {booking.businessName || booking.userName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {booking.userName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {booking.resources.slice(0, 3).map((r, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {r.resourceName}
                            </Badge>
                          ))}
                          {booking.resources.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{booking.resources.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={booking.status} type="booking" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View booking"
                            onClick={() =>
                              router.push(`/admin/bookings/${booking.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit booking"
                            onClick={() =>
                              router.push(`/admin/bookings/${booking.id}/edit`)
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {booking.status !== 'cancelled' &&
                            booking.status !== 'completed' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Cancel booking"
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setCancelDialogOpen(true);
                                }}
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          {(booking.status === 'pending' ||
                            booking.status === 'cancelled') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Force override to confirmed"
                              onClick={() => handleForceOverride(booking)}
                            >
                              <ShieldAlert className="h-4 w-4 text-orange-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Booking"
        description={`Are you sure you want to cancel the booking for ${selectedBooking?.businessName || selectedBooking?.userName}? This action cannot be undone.`}
        confirmLabel="Cancel Booking"
        variant="destructive"
        onConfirm={handleCancel}
        loading={actionLoading}
      />
    </div>
  );
}
