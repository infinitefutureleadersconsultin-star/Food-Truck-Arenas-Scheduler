'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  UserCheck,
  UserX,
  RefreshCw,
  Trash2,
  MessageSquare,
  FileText,
  Download,
  Eye,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils/cn';
import { getUser, updateUser, updateVendorStatus, deleteUser } from '@/lib/services/userService';
import { getBookingsByUser } from '@/lib/services/bookingService';
import { getAttendanceByUser, getAttendanceStats } from '@/lib/services/attendanceService';
import { formatDate, formatTime } from '@/lib/utils/dateUtils';
import type { User, Booking, AttendanceLog } from '@/lib/types';

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;

  // Data
  const [vendor, setVendor] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<{
    total: number;
    onTimePercent: number;
    latePercent: number;
    noShowPercent: number;
    completedPercent: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin notes
  const [adminNotes, setAdminNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dialogs
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    variant: 'default' | 'destructive';
    action: () => Promise<void>;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch all data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [vendorData, bookingsData, attendanceData, statsData] =
          await Promise.all([
            getUser(vendorId),
            getBookingsByUser(vendorId),
            getAttendanceByUser(vendorId),
            getAttendanceStats(vendorId),
          ]);

        if (!vendorData) {
          setError('Vendor not found.');
          setLoading(false);
          return;
        }

        setVendor(vendorData);
        setAdminNotes(vendorData.adminNotes || '');
        setBookings(bookingsData);
        setAttendance(attendanceData);
        setAttendanceStats(statsData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load vendor data.'
        );
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [vendorId]);

  // Auto-save admin notes with debounce
  const handleNotesChange = useCallback(
    (value: string) => {
      setAdminNotes(value);
      if (notesTimeoutRef.current) {
        clearTimeout(notesTimeoutRef.current);
      }
      notesTimeoutRef.current = setTimeout(async () => {
        setNotesSaving(true);
        try {
          await updateUser(vendorId, { adminNotes: value });
        } catch (err) {
          console.error('Failed to save notes:', err);
        } finally {
          setNotesSaving(false);
        }
      }, 1000);
    },
    [vendorId]
  );

  // Actions
  const handleStatusAction = useCallback(
    (action: 'approve' | 'suspend' | 'reactivate') => {
      const configs = {
        approve: {
          title: 'Approve Vendor',
          description: `Approve ${vendor?.businessName} to access the platform and book resources.`,
          variant: 'default' as const,
          status: 'active' as const,
        },
        suspend: {
          title: 'Suspend Vendor',
          description: `Suspend ${vendor?.businessName}. They will lose access to book resources.`,
          variant: 'destructive' as const,
          status: 'suspended' as const,
        },
        reactivate: {
          title: 'Reactivate Vendor',
          description: `Reactivate ${vendor?.businessName}. They will regain access to the platform.`,
          variant: 'default' as const,
          status: 'active' as const,
        },
      };

      const config = configs[action];
      setConfirmConfig({
        title: config.title,
        description: config.description,
        variant: config.variant,
        action: async () => {
          await updateVendorStatus(vendorId, config.status);
          setVendor((prev) => (prev ? { ...prev, status: config.status } : null));
        },
      });
      setConfirmOpen(true);
    },
    [vendor, vendorId]
  );

  const handleRemove = useCallback(() => {
    setConfirmConfig({
      title: 'Remove Vendor',
      description: `Permanently remove ${vendor?.businessName}. All their data will be deleted. This cannot be undone.`,
      variant: 'destructive',
      action: async () => {
        await deleteUser(vendorId);
        router.push('/admin/vendors');
      },
    });
    setConfirmOpen(true);
  }, [vendor, vendorId, router]);

  const handleConfirm = useCallback(async () => {
    if (!confirmConfig) return;
    setActionLoading(true);
    try {
      await confirmConfig.action();
      setConfirmOpen(false);
      setConfirmConfig(null);
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActionLoading(false);
    }
  }, [confirmConfig]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-red-600">{error || 'Vendor not found'}</p>
        <Button variant="outline" onClick={() => router.push('/admin/vendors')}>
          Back to Vendors
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/admin/vendors')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {vendor.displayName}
          </h1>
          <p className="text-gray-500">{vendor.businessName}</p>
        </div>
        <StatusBadge status={vendor.status} type="user" />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {vendor.status === 'pending' && (
          <Button onClick={() => handleStatusAction('approve')}>
            <UserCheck className="mr-2 h-4 w-4" />
            Approve
          </Button>
        )}
        {vendor.status === 'active' && (
          <Button
            variant="outline"
            onClick={() => handleStatusAction('suspend')}
          >
            <UserX className="mr-2 h-4 w-4" />
            Suspend
          </Button>
        )}
        {vendor.status === 'suspended' && (
          <Button onClick={() => handleStatusAction('reactivate')}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reactivate
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => router.push('/admin/communications')}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Send Message
        </Button>
        <Button variant="destructive" onClick={handleRemove}>
          <Trash2 className="mr-2 h-4 w-4" />
          Remove
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Full Name</p>
                <p className="font-medium">{vendor.displayName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Business</p>
                <p className="font-medium">{vendor.businessName}</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <a
                  href={`mailto:${vendor.email}`}
                  className="text-blue-600 hover:underline"
                >
                  {vendor.email}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{vendor.phone || 'No phone'}</span>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Vehicle Size</p>
                <p className="capitalize">{vendor.vehicleSize || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Default Resources</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {vendor.defaultResources && (
                    <>
                      {vendor.defaultResources.tables > 0 && (
                        <Badge variant="secondary">
                          {vendor.defaultResources.tables} Tables
                        </Badge>
                      )}
                      {vendor.defaultResources.fridges > 0 && (
                        <Badge variant="secondary">
                          {vendor.defaultResources.fridges} Fridges
                        </Badge>
                      )}
                      {vendor.defaultResources.freezers > 0 && (
                        <Badge variant="secondary">
                          {vendor.defaultResources.freezers} Freezers
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-500">Member Since</p>
                <p>
                  {vendor.createdAt
                    ? formatDate(vendor.createdAt.toDate(), 'MMM d, yyyy')
                    : 'Unknown'}
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-500">Last Login</p>
                <p>
                  {vendor.lastLoginAt
                    ? formatDate(vendor.lastLoginAt.toDate(), 'MMM d, yyyy')
                    : 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Section */}
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {(!vendor.documents || vendor.documents.length === 0) ? (
              <p className="py-8 text-center text-sm text-gray-500">
                No documents uploaded.
              </p>
            ) : (
              <div className="space-y-3">
                {vendor.documents.map((doc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {doc.type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {doc.fileName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          doc.status === 'valid'
                            ? 'success'
                            : doc.status === 'expiring_soon'
                              ? 'warning'
                              : 'destructive'
                        }
                      >
                        {doc.status === 'valid'
                          ? 'Valid'
                          : doc.status === 'expiring_soon'
                            ? 'Expiring Soon'
                            : 'Expired'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="View document"
                        onClick={() => window.open(doc.fileUrl, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Download document"
                        onClick={() => window.open(doc.fileUrl, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance Stats */}
      {attendanceStats && attendanceStats.total > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {attendanceStats.onTimePercent}%
                  </p>
                  <p className="text-xs text-gray-500">On-Time Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {attendanceStats.latePercent}%
                  </p>
                  <p className="text-xs text-gray-500">Late Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {attendanceStats.noShowPercent}%
                  </p>
                  <p className="text-xs text-gray-500">No-Show Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{attendanceStats.total}</p>
                  <p className="text-xs text-gray-500">Total Bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Booking History */}
      <Card>
        <CardHeader>
          <CardTitle>Booking History</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No bookings yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Resources</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.slice(0, 20).map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{formatDate(booking.date)}</TableCell>
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
                      <StatusBadge status={booking.status} type="booking" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Attendance Record */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Record</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No attendance records yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Check-In</TableHead>
                  <TableHead>Check-Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Late By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.slice(0, 20).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDate(log.date)}</TableCell>
                    <TableCell>
                      {formatTime(log.scheduledStart)} -{' '}
                      {formatTime(log.scheduledEnd)}
                    </TableCell>
                    <TableCell>
                      {log.actualCheckIn
                        ? formatDate(
                            log.actualCheckIn.toDate(),
                            'h:mm a'
                          )
                        : '--'}
                    </TableCell>
                    <TableCell>
                      {log.actualCheckOut
                        ? formatDate(
                            log.actualCheckOut.toDate(),
                            'h:mm a'
                          )
                        : '--'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.status === 'on_time' || log.status === 'completed'
                            ? 'success'
                            : log.status === 'late'
                              ? 'warning'
                              : log.status === 'no_show'
                                ? 'destructive'
                                : 'secondary'
                        }
                      >
                        {log.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.lateMinutes > 0
                        ? `${log.lateMinutes} min`
                        : '--'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Admin Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Admin Notes</CardTitle>
            {notesSaving && (
              <span className="text-xs text-gray-400">Saving...</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Private notes about this vendor (auto-saves)..."
            value={adminNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      {confirmConfig && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={confirmConfig.title}
          description={confirmConfig.description}
          variant={confirmConfig.variant}
          onConfirm={handleConfirm}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
