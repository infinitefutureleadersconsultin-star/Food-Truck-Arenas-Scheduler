'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { formatDate, formatTime } from '@/lib/utils/dateUtils';
import { formatDuration, formatBookingStatus } from '@/lib/utils/formatters';
import { cancelBooking } from '@/lib/services/bookingService';
import { STATUS_COLORS } from '@/lib/utils/constants';
import { timeToMinutes } from '@/lib/utils/dateUtils';
import type { Booking, BookingStatus } from '@/lib/types';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar,
  Clock,
  MapPin,
  Edit2,
  X,
  QrCode,
  Loader2,
  AlertTriangle,
  User,
  Package,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingSummaryProps {
  booking: Booking;
  onEdit?: (booking: Booking) => void;
  onCancelled?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusBadgeVariant(
  status: BookingStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'checked_in':
      return 'info';
    case 'completed':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    case 'no_show':
      return 'destructive';
    default:
      return 'outline';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingSummary({
  booking,
  onEdit,
  onCancelled,
}: BookingSummaryProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const durationMinutes = useMemo(
    () => timeToMinutes(booking.endTime) - timeToMinutes(booking.startTime),
    [booking.startTime, booking.endTime],
  );

  const qrValue = useMemo(
    () =>
      JSON.stringify({
        bookingId: booking.id,
        userId: booking.userId,
        date: booking.date,
        startTime: booking.startTime,
      }),
    [booking],
  );

  const canEdit =
    booking.status === 'pending' || booking.status === 'confirmed';
  const canCancel =
    booking.status === 'pending' || booking.status === 'confirmed';

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setCancelError('Please provide a reason for cancellation.');
      return;
    }

    setCancelling(true);
    setCancelError(null);

    try {
      await cancelBooking(booking.id, booking.userId, cancelReason);
      setCancelDialogOpen(false);
      onCancelled?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to cancel booking.';
      setCancelError(message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        {/* Status bar at top */}
        <div
          className={cn(
            'h-1.5',
            STATUS_COLORS.booking[booking.status]?.dot ?? 'bg-gray-400',
          )}
        />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">Booking Confirmation</CardTitle>
            <Badge variant={getStatusBadgeVariant(booking.status)}>
              {formatBookingStatus(booking.status)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Calendar className="h-4.5 w-4.5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="text-sm font-medium">
                  {formatDate(booking.date)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                <Clock className="h-4.5 w-4.5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Time</p>
                <p className="text-sm font-medium">
                  {formatTime(booking.startTime)} -{' '}
                  {formatTime(booking.endTime)}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDuration(durationMinutes)}
                </p>
              </div>
            </div>
          </div>

          {/* User info */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
              <User className="h-4.5 w-4.5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Vendor</p>
              <p className="text-sm font-medium">{booking.businessName}</p>
              <p className="text-xs text-gray-400">{booking.userName}</p>
            </div>
          </div>

          <Separator />

          {/* Assigned Resources */}
          {booking.resources.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Assigned Resources
              </p>
              <div className="space-y-1.5">
                {booking.resources.map((res, idx) => (
                  <div
                    key={`${res.resourceId}-${idx}`}
                    className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{res.resourceName}</span>
                    <span className="text-xs text-gray-400">
                      ({res.resourceTypeName})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resource Requests (if resources not yet assigned) */}
          {booking.resources.length === 0 &&
            Object.keys(booking.resourceRequests).length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Requested Resources
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(booking.resourceRequests).map(
                    ([typeId, count]) => (
                      <Badge key={typeId} variant="secondary">
                        {count}x {typeId}
                      </Badge>
                    ),
                  )}
                </div>
              </div>
            )}

          {/* Notes */}
          {booking.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Notes
              </p>
              <p className="text-sm text-gray-700">{booking.notes}</p>
            </div>
          )}

          <Separator />

          {/* QR Code for Check-in */}
          {(booking.status === 'confirmed' ||
            booking.status === 'pending') && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <QrCode className="h-4 w-4" />
                Check-in QR Code
              </div>
              <div className="rounded-xl border-2 border-gray-100 p-3 bg-white">
                <QRCodeSVG
                  value={qrValue}
                  size={160}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs text-gray-400 text-center">
                Scan this code at the commissary to check in.
              </p>
            </div>
          )}

          {/* Recurring indicator */}
          {booking.isRecurring && booking.recurringPattern && (
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
              Recurring: {booking.recurringPattern.frequency}
              {booking.recurringPattern.daysOfWeek.length > 0 &&
                ` on ${booking.recurringPattern.daysOfWeek
                  .map((d) =>
                    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d],
                  )
                  .join(', ')}`}
            </div>
          )}
        </CardContent>

        {/* Action buttons */}
        {(canEdit || canCancel) && (
          <CardFooter className="justify-end gap-2 border-t bg-gray-50/50 px-6 py-4">
            {canEdit && onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => onEdit(booking)}
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={() => setCancelDialogOpen(true)}
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      {/* Cancel dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking for{' '}
              {formatDate(booking.date)}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Reason for cancellation</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Please provide a reason..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>

            {cancelError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {cancelError}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelling}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelling}
              className="gap-2"
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
