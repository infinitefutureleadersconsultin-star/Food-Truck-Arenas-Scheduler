'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CalendarPlus,
  Clock,
  CalendarX,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  scheduleAppointment,
  getUserAppointments,
  getBookedSlotsForDate,
  morningCheckIn,
  cancelAppointment,
  recordCheckIn,
} from '@/lib/services/appointmentService';
import { formatDate, formatTime } from '@/lib/utils/dateUtils';
import { cn } from '@/lib/utils/cn';
import type { Appointment, AppointmentType } from '@/lib/types';

const APPOINTMENT_TYPES: { value: AppointmentType; label: string }[] = [
  { value: 'walk_through', label: 'Facility Walk-Through' },
  { value: 'meeting', label: 'Meeting with Admin' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'other', label: 'Other' },
];

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30',
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  checked_in: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-600',
  no_show: 'bg-red-100 text-red-700',
};

export default function AppointmentsPage() {
  const { user, userData } = useAuthContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<{ startTime: string; endTime: string }[]>([]);

  // Form state
  const [apptType, setApptType] = useState<AppointmentType>('walk_through');
  const [purpose, setPurpose] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const fetchAppointments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserAppointments(user.uid);
      setAppointments(data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Load booked slots when date changes
  useEffect(() => {
    if (!apptDate) {
      setBookedSlots([]);
      return;
    }
    getBookedSlotsForDate(apptDate)
      .then(setBookedSlots)
      .catch(() => setBookedSlots([]));
  }, [apptDate]);

  // Minimum date is tomorrow (24-hour notice)
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Determine which slots are taken
  const takenSlots = useMemo(() => {
    return new Set(
      bookedSlots.flatMap((slot) => {
        const taken: string[] = [];
        for (const ts of TIME_SLOTS) {
          if (ts >= slot.startTime && ts < slot.endTime) {
            taken.push(ts);
          }
        }
        return taken;
      })
    );
  }, [bookedSlots]);

  // Today's appointments that need morning check-in
  const today = new Date().toISOString().split('T')[0];
  const todaysAppointments = appointments.filter(
    (a) => a.date === today && (a.status === 'pending' || a.status === 'confirmed')
  );
  const needsMorningCheckIn = todaysAppointments.filter((a) => !a.checkedInMorningOf);

  // Is it before 10 AM?
  const now = new Date();
  const isBefore10AM = now.getHours() < 10;

  const handleSubmit = async () => {
    if (!user || !userData) return;
    if (!apptDate || !apptTime || !purpose.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setFormSuccess(false);

    // Calculate end time (30 min slot)
    const [h, m] = apptTime.split(':').map(Number);
    const endMinutes = h * 60 + m + 30;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    try {
      await scheduleAppointment(
        user.uid,
        userData.displayName || '',
        userData.email,
        userData.phone || '',
        userData.businessName || '',
        apptType,
        purpose.trim(),
        apptDate,
        apptTime,
        endTime
      );
      setFormSuccess(true);
      setPurpose('');
      setApptDate('');
      setApptTime('');
      setShowForm(false);
      await fetchAppointments();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to schedule appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMorningCheckIn = async (appointmentId: string) => {
    try {
      await morningCheckIn(appointmentId);

      // Record check-in alert so admin/team sees it immediately
      const appt = appointments.find((a) => a.id === appointmentId);
      if (appt && user) {
        await recordCheckIn({
          appointmentId,
          userId: user.uid,
          name: appt.userName || userData?.displayName || '',
          email: appt.userEmail || userData?.email || '',
          businessName: appt.businessName || userData?.businessName || '',
          type: appt.type,
          date: appt.date,
          startTime: appt.startTime,
          endTime: appt.endTime,
          source: 'vendor_profile',
        });
      }

      await fetchAppointments();
    } catch (err) {
      console.error('Error checking in:', err);
    }
  };

  const handleCancel = async (appointmentId: string) => {
    try {
      await cancelAppointment(appointmentId, 'Cancelled by vendor');
      await fetchAppointments();
    } catch (err) {
      console.error('Error cancelling:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Schedule walk-throughs, meetings, and consultations
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <CalendarPlus className="mr-2 h-4 w-4" />
          Schedule Appointment
        </Button>
      </div>

      {/* Morning check-in alert */}
      {needsMorningCheckIn.length > 0 && isBefore10AM && (
        <Card className="border-2 border-orange-300 bg-orange-50 shadow-md">
          <CardContent className="py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-200">
                <AlertTriangle className="h-5 w-5 text-orange-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-orange-900">
                  Check In Now
                </h3>
                <p className="mt-1 text-sm text-orange-700">
                  You have {needsMorningCheckIn.length} appointment(s) today that
                  need check-in. Tap the button below before 10:00 AM or your
                  appointment will be automatically cancelled.
                </p>
                <div className="mt-4 space-y-3">
                  {needsMorningCheckIn.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between rounded-xl border border-orange-200 bg-white p-4 shadow-sm"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {APPOINTMENT_TYPES.find((t) => t.value === appt.type)?.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTime(appt.startTime)} — {appt.purpose}
                        </p>
                      </div>
                      <Button
                        className="bg-orange-600 px-6 text-sm font-bold hover:bg-orange-700"
                        onClick={() => handleMorningCheckIn(appt.id)}
                      >
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Check In
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* After 10 AM warning for unchecked appointments */}
      {needsMorningCheckIn.length > 0 && !isBefore10AM && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 py-4">
            <CalendarX className="h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-900">
                Check-in window closed
              </p>
              <p className="text-xs text-red-700">
                The 10:00 AM check-in deadline has passed. Unchecked appointments
                will be cancelled. Please reschedule.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {formSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800">
              Appointment scheduled successfully! Remember to check in by 10:00 AM on the day of your appointment.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Schedule Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Schedule an Appointment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-blue-700">
                <strong>Important:</strong> Appointments must be booked at least 24 hours
                in advance. On the morning of your appointment, you must check in by
                10:00 AM to confirm. Failure to check in will result in automatic cancellation.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Appointment Type *</Label>
                <Select
                  value={apptType}
                  onValueChange={(v) => setApptType(v as AppointmentType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  min={minDate}
                  value={apptDate}
                  onChange={(e) => setApptDate(e.target.value)}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Time Slot * {apptDate && <span className="text-xs text-gray-400">(greyed out = already booked)</span>}</Label>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {TIME_SLOTS.map((slot) => {
                    const isTaken = takenSlots.has(slot);
                    const isSelected = apptTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isTaken}
                        onClick={() => setApptTime(slot)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                          isTaken
                            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through'
                            : isSelected
                              ? 'border-primary bg-primary text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-primary hover:bg-primary/5'
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Purpose / Notes *</Label>
              <Textarea
                placeholder="Describe the purpose of your visit..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Scheduling...' : 'Schedule Appointment'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="No appointments yet"
          description="Schedule a walk-through, meeting, or consultation to get started."
          action={{
            label: 'Schedule Appointment',
            onClick: () => setShowForm(true),
          }}
        />
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <Card key={appt.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {APPOINTMENT_TYPES.find((t) => t.value === appt.type)?.label}
                      </p>
                      <Badge
                        className={STATUS_COLORS[appt.status] || 'bg-gray-100 text-gray-700'}
                        variant="secondary"
                      >
                        {appt.status.replace('_', ' ')}
                      </Badge>
                      {appt.checkedInMorningOf && (
                        <Badge className="bg-green-100 text-green-700" variant="secondary">
                          Morning check-in done
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(appt.date, 'MMM d, yyyy')} at {formatTime(appt.startTime)} - {formatTime(appt.endTime)}
                      </span>
                    </div>
                    {appt.purpose && (
                      <p className="mt-1 text-xs text-gray-500">{appt.purpose}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {appt.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => handleCancel(appt.id)}
                    >
                      Cancel
                    </Button>
                  )}
                  {appt.date === today && !appt.checkedInMorningOf && isBefore10AM &&
                    (appt.status === 'pending' || appt.status === 'confirmed') && (
                    <Button
                      className="animate-pulse bg-orange-600 px-5 font-bold hover:bg-orange-700"
                      onClick={() => handleMorningCheckIn(appt.id)}
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Check In
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
