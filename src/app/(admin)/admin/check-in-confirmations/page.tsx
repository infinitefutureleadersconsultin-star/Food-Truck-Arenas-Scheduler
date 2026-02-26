'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Users,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  getConfirmationsByDate,
  sendConfirmationReminder,
  markNotConfirmed,
} from '@/lib/services/checkinConfirmationService';
import { formatTime } from '@/lib/utils/dateUtils';
import type { CheckInConfirmation, ConfirmationStatus } from '@/lib/types';

const STATUS_CONFIG: Record<
  ConfirmationStatus,
  { label: string; icon: typeof CheckCircle2; color: string; bgColor: string }
> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle2,
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  not_confirmed: {
    label: 'Not Confirmed',
    icon: XCircle,
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
};

export default function CheckInConfirmationsPage() {
  const [confirmations, setConfirmations] = useState<CheckInConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const fetchConfirmations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getConfirmationsByDate(selectedDate);
      setConfirmations(data);
    } catch (err) {
      console.error('Error fetching confirmations:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchConfirmations();
  }, [fetchConfirmations]);

  const handleSendReminder = async (confirmation: CheckInConfirmation) => {
    setSendingReminder(confirmation.id);
    try {
      await sendConfirmationReminder(
        confirmation.id,
        confirmation.userId,
        confirmation.date,
        confirmation.startTime
      );
      await fetchConfirmations();
    } catch (err) {
      console.error('Error sending reminder:', err);
    } finally {
      setSendingReminder(null);
    }
  };

  const handleMarkNotConfirmed = async (confirmationId: string) => {
    try {
      await markNotConfirmed(confirmationId);
      await fetchConfirmations();
    } catch (err) {
      console.error('Error marking not confirmed:', err);
    }
  };

  const stats = {
    total: confirmations.length,
    confirmed: confirmations.filter((c) => c.confirmationStatus === 'confirmed').length,
    pending: confirmations.filter((c) => c.confirmationStatus === 'pending').length,
    notConfirmed: confirmations.filter((c) => c.confirmationStatus === 'not_confirmed').length,
  };

  const formatTimestamp = (timestamp: { toDate?: () => Date } | null) => {
    if (!timestamp?.toDate) return '-';
    return timestamp.toDate().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-7 w-7 text-gray-700" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Check-in Confirmations
            </h1>
            <p className="text-sm text-gray-500">
              Track customer attendance confirmations for the day
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <Button variant="outline" size="sm" onClick={fetchConfirmations}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="mx-auto h-5 w-5 text-gray-400" />
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total Bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="mx-auto h-5 w-5 text-green-500" />
            <p className="mt-1 text-2xl font-bold text-green-600">{stats.confirmed}</p>
            <p className="text-xs text-gray-500">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="mx-auto h-5 w-5 text-yellow-500" />
            <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="mx-auto h-5 w-5 text-red-500" />
            <p className="mt-1 text-2xl font-bold text-red-600">{stats.notConfirmed}</p>
            <p className="text-xs text-gray-500">Not Confirmed</p>
          </CardContent>
        </Card>
      </div>

      {/* Potential no-show warning */}
      {stats.pending > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />
            <div>
              <p className="text-sm font-semibold text-yellow-900">
                {stats.pending} customer(s) haven&apos;t confirmed attendance
              </p>
              <p className="text-xs text-yellow-700">
                Consider sending reminders to reduce no-shows and save costs.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmations List */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : confirmations.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No confirmations for this date"
          description="Check-in confirmations will appear here when customers have bookings."
        />
      ) : (
        <div className="space-y-3">
          {confirmations.map((confirmation) => {
            const statusConfig =
              STATUS_CONFIG[confirmation.confirmationStatus];
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={confirmation.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-full p-2 ${statusConfig.bgColor}`}>
                      <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {confirmation.userName}
                        </p>
                        {confirmation.businessName && (
                          <span className="text-xs text-gray-500">
                            ({confirmation.businessName})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(confirmation.startTime)} - {formatTime(confirmation.endTime)}
                        </span>
                        {confirmation.assignedTeamMemberName && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {confirmation.assignedTeamMemberName}
                          </span>
                        )}
                        {confirmation.confirmedAt && (
                          <span>
                            Confirmed at {formatTimestamp(confirmation.confirmedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      className={`${statusConfig.bgColor} ${statusConfig.color}`}
                      variant="secondary"
                    >
                      {statusConfig.label}
                    </Badge>

                    {confirmation.confirmationStatus === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendReminder(confirmation)}
                          disabled={sendingReminder === confirmation.id}
                        >
                          <Send className="mr-1 h-3 w-3" />
                          {sendingReminder === confirmation.id
                            ? 'Sending...'
                            : confirmation.reminderSentAt
                              ? 'Resend'
                              : 'Send Reminder'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => handleMarkNotConfirmed(confirmation.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
