'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  AlertTriangle,
  RefreshCw,
  Building2,
  Send,
  Eye,
  Trash2,
  Bell,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  getAllAppointments,
  confirmAppointment,
  cancelAppointment,
  completeAppointment,
  markAppointmentNoShow,
  updateAppointmentNotes,
  getCheckInsForDate,
  markCheckInRead,
} from '@/lib/services/appointmentService';
import { formatDate, formatTime } from '@/lib/utils/dateUtils';
import type { Appointment, AppointmentStatus } from '@/lib/types';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
  checked_in: { label: 'Checked In', color: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-600' },
  no_show: { label: 'No Show', color: 'bg-red-100 text-red-700' },
};

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  walk_through: 'Facility Walk-Through',
  meeting: 'Meeting',
  consultation: 'Consultation',
  other: 'Other',
};

export default function AdminAppointmentsPage() {
  const { userData } = useAuthContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AppointmentStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState('');

  const [checkInAlerts, setCheckInAlerts] = useState<
    { id: string; name: string; email: string; businessName: string; type: string;
      date: string; startTime: string; endTime: string; source: string;
      checkedInAt: { toDate?: () => Date } | null; readByAdmin: boolean;
      appointmentId?: string; userId?: string }[]
  >([]);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllAppointments(
        filter === 'all' ? undefined : filter
      );
      setAppointments(data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchCheckInAlerts = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const alerts = await getCheckInsForDate(today);
      setCheckInAlerts(alerts);
    } catch (err) {
      console.error('Error fetching check-in alerts:', err);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetchCheckInAlerts();
    // Poll every 30 seconds for new check-ins
    const interval = setInterval(fetchCheckInAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchCheckInAlerts]);

  const handleConfirm = async (appt: Appointment) => {
    // Auto-assign to first active team member if available
    const teamMember = userData?.teamMembers?.find((m) => m.isActive);
    try {
      await confirmAppointment(
        appt.id,
        teamMember?.id,
        teamMember?.name
      );
      await fetchAppointments();
    } catch (err) {
      console.error('Error confirming appointment:', err);
    }
  };

  const handleCancel = async (apptId: string) => {
    try {
      await cancelAppointment(apptId, 'Cancelled by admin');
      await fetchAppointments();
    } catch (err) {
      console.error('Error cancelling:', err);
    }
  };

  const handleComplete = async (apptId: string) => {
    try {
      await completeAppointment(apptId);
      await fetchAppointments();
    } catch (err) {
      console.error('Error completing:', err);
    }
  };

  const handleNoShow = async (apptId: string) => {
    try {
      await markAppointmentNoShow(apptId);
      await fetchAppointments();
    } catch (err) {
      console.error('Error marking no-show:', err);
    }
  };

  const handleSaveNotes = async (apptId: string) => {
    try {
      await updateAppointmentNotes(apptId, notesInput);
      await fetchAppointments();
      setExpandedId(null);
    } catch (err) {
      console.error('Error saving notes:', err);
    }
  };

  const handleAcknowledgeCheckIn = async (checkInId: string) => {
    await markCheckInRead(checkInId);
    await fetchCheckInAlerts();
  };

  const formatTimestamp = (timestamp: { toDate?: () => Date } | null) => {
    if (!timestamp?.toDate) return '-';
    return timestamp.toDate().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const stats = {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    today: appointments.filter(
      (a) => a.date === new Date().toISOString().split('T')[0] &&
        ['pending', 'confirmed', 'checked_in'].includes(a.status)
    ).length,
  };

  // Identify appointments where morning check-in was missed (past 10 AM, no morning check-in)
  const todayStr = new Date().toISOString().split('T')[0];
  const missedCheckIns = appointments.filter(
    (a) =>
      a.date === todayStr &&
      !a.checkedInMorningOf &&
      (a.status === 'pending' || a.status === 'confirmed') &&
      new Date().getHours() >= 10
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarCheck className="h-7 w-7 text-gray-700" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
            <p className="text-sm text-gray-500">
              Manage walk-throughs, meetings, and consultations
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchAppointments(); fetchCheckInAlerts(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p>
            <p className="text-xs text-gray-500">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.today}</p>
            <p className="text-xs text-gray-500">Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Live check-in alerts */}
      {checkInAlerts.filter((a) => !a.readByAdmin).length > 0 && (
        <Card className="border-2 border-green-300 bg-green-50 shadow-md">
          <CardContent className="py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-200">
                <Bell className="h-5 w-5 text-green-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-green-900">
                  {checkInAlerts.filter((a) => !a.readByAdmin).length} New Check-In(s) Today
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  These people confirmed they are still coming for their appointment.
                </p>
                <div className="mt-4 space-y-3">
                  {checkInAlerts
                    .filter((a) => !a.readByAdmin)
                    .map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-center justify-between rounded-xl border border-green-200 bg-white p-4 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">
                              {alert.name}
                            </p>
                            {alert.businessName && (
                              <span className="text-xs text-gray-500">
                                ({alert.businessName})
                              </span>
                            )}
                            <Badge
                              className="bg-green-100 text-green-700"
                              variant="secondary"
                            >
                              Checked In
                            </Badge>
                            <Badge
                              className={
                                alert.source === 'vendor_profile'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-purple-100 text-purple-700'
                              }
                              variant="secondary"
                            >
                              {alert.source === 'vendor_profile'
                                ? 'Vendor Account'
                                : 'Public Page'}
                            </Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                            <span>
                              {APPOINTMENT_TYPE_LABELS[alert.type] || alert.type}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(alert.startTime)} - {formatTime(alert.endTime)}
                            </span>
                            <span>
                              Checked in at{' '}
                              {alert.checkedInAt?.toDate
                                ? alert.checkedInAt.toDate().toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:bg-green-50"
                          onClick={() => handleAcknowledgeCheckIn(alert.id)}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Acknowledge
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missed check-in warning */}
      {missedCheckIns.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-900">
                {missedCheckIns.length} appointment(s) missed the 10:00 AM check-in
              </p>
              <p className="text-xs text-red-700">
                These visitors did not confirm by 10 AM. You can mark them as no-show
                or cancel their appointments.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label || f}
          </Button>
        ))}
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No appointments found"
          description="Appointments from vendors will appear here."
        />
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => {
            const statusConfig = STATUS_CONFIG[appt.status];
            const isExpanded = expandedId === appt.id;

            return (
              <Card key={appt.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">
                            {appt.userName}
                          </p>
                          {appt.businessName && (
                            <span className="text-xs text-gray-500">({appt.businessName})</span>
                          )}
                          <Badge className={statusConfig.color} variant="secondary">
                            {statusConfig.label}
                          </Badge>
                          {appt.checkedInMorningOf && (
                            <Badge className="bg-green-100 text-green-700" variant="secondary">
                              Morning check-in done
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span>
                            {APPOINTMENT_TYPE_LABELS[appt.type] || appt.type}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(appt.date, 'MMM d, yyyy')} at {formatTime(appt.startTime)} - {formatTime(appt.endTime)}
                          </span>
                          {appt.assignedTeamMemberName && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {appt.assignedTeamMemberName}
                            </span>
                          )}
                          {appt.morningCheckInAt && (
                            <span>
                              Checked in at {formatTimestamp(appt.morningCheckInAt)}
                            </span>
                          )}
                        </div>
                        {appt.purpose && (
                          <p className="mt-1 text-xs text-gray-600">{appt.purpose}</p>
                        )}
                        {appt.adminNotes && (
                          <p className="mt-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
                            Admin: {appt.adminNotes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      {appt.status === 'pending' && (
                        <>
                          <Button size="sm" onClick={() => handleConfirm(appt)}>
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => handleCancel(appt.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {(appt.status === 'confirmed' || appt.status === 'checked_in') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600"
                            onClick={() => handleComplete(appt.id)}
                          >
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => handleNoShow(appt.id)}
                          >
                            No Show
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (isExpanded) {
                            setExpandedId(null);
                          } else {
                            setExpandedId(appt.id);
                            setNotesInput(appt.adminNotes || '');
                          }
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-gray-500">Email:</span>{' '}
                          <span className="text-gray-900">{appt.userEmail}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Phone:</span>{' '}
                          <span className="text-gray-900">{appt.userPhone || 'N/A'}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700">
                          Admin Notes
                        </label>
                        <Textarea
                          className="mt-1"
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          placeholder="Add notes about this appointment..."
                        />
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => handleSaveNotes(appt.id)}
                        >
                          Save Notes
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
