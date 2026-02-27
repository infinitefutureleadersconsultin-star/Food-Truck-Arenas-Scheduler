'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChefHat,
  ArrowRight,
  Info,
  User,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { recordCheckIn } from '@/lib/services/appointmentService';

interface PendingAppointment {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  type: string;
  purpose: string;
  date: string;
  startTime: string;
  endTime: string;
  savedAt: string;
  checkedIn?: boolean;
  checkedInAt?: string | null;
}

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  walk_through: 'Facility Walk-Through',
  meeting: 'Meeting with Admin',
  consultation: 'Consultation',
  other: 'Other',
};

export default function AppointmentConfirmationPage() {
  const [appointment, setAppointment] = useState<PendingAppointment | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pendingAppointment');
      if (raw) {
        const parsed = JSON.parse(raw);
        setAppointment(parsed);
        setCheckedIn(!!parsed.checkedIn);
      }
    } catch {
      // Invalid data
    }
    setLoading(false);
  }, []);

  const isAppointmentToday = () => {
    if (!appointment) return false;
    const today = new Date().toISOString().split('T')[0];
    return appointment.date === today;
  };

  const isBefore10AM = () => {
    return new Date().getHours() < 10;
  };

  const [checkingIn, setCheckingIn] = useState(false);

  const handleCheckIn = async () => {
    if (!appointment) return;
    setCheckingIn(true);
    try {
      // Save to localStorage (existing behavior)
      const updated = {
        ...appointment,
        checkedIn: true,
        checkedInAt: new Date().toISOString(),
      };
      localStorage.setItem('pendingAppointment', JSON.stringify(updated));
      setAppointment(updated);
      setCheckedIn(true);

      // Also record in Firestore so admin/team sees it immediately
      await recordCheckIn({
        name: appointment.name,
        email: appointment.email,
        businessName: appointment.businessName,
        type: appointment.type,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        source: 'public_confirmation',
      });
    } catch {
      // Check-in saved locally even if Firestore write fails
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="border-b bg-white">
          <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-4">
            <Link href="/" className="flex items-center gap-2">
              <ChefHat className="h-7 w-7 text-primary" />
              <span className="text-lg font-bold text-gray-900">Food Truck Arena</span>
            </Link>
          </div>
        </nav>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <CalendarCheck className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h1 className="text-xl font-bold text-gray-900">No Appointment Found</h1>
          <p className="mt-2 text-sm text-gray-500">
            You don&apos;t have a pending appointment. Schedule one from our homepage.
          </p>
          <Link href="/">
            <Button className="mt-6">Go to Homepage</Button>
          </Link>
        </div>
      </div>
    );
  }

  const showCheckIn = isAppointmentToday() && isBefore10AM() && !checkedIn;
  const missedCheckIn = isAppointmentToday() && !isBefore10AM() && !checkedIn;
  const apptDateObj = new Date(appointment.date + 'T00:00:00');
  const formattedDate = apptDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <ChefHat className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold text-gray-900">Food Truck Arena</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Create Account
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Success banner */}
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-green-900">
              Appointment Scheduled
            </h1>
            <p className="text-sm text-green-700">
              Your appointment has been saved. See details below.
            </p>
          </div>
        </div>

        {/* Appointment details */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-gray-900">
                Appointment Details
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase text-gray-400">Type</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {APPOINTMENT_TYPE_LABELS[appointment.type] || appointment.type}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-400">Date</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {formattedDate}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-400">Time</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  <Clock className="mr-1 inline h-3.5 w-3.5 text-gray-400" />
                  {appointment.startTime} – {appointment.endTime}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-400">
                  Business
                </p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  <Building2 className="mr-1 inline h-3.5 w-3.5 text-gray-400" />
                  {appointment.businessName}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-400">Name</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  <User className="mr-1 inline h-3.5 w-3.5 text-gray-400" />
                  {appointment.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-400">
                  Contact
                </p>
                <p className="mt-0.5 text-sm text-gray-700">
                  {appointment.email}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase text-gray-400">
                  Purpose
                </p>
                <p className="mt-0.5 text-sm text-gray-700">{appointment.purpose}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check-in section — only visible on appointment day before 10 AM */}
        {showCheckIn && (
          <Card className="mb-6 border-2 border-orange-300 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-200">
                  <Clock className="h-5 w-5 text-orange-700" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-orange-900">
                    Check In Now
                  </h3>
                  <p className="mt-1 text-sm text-orange-700">
                    Your appointment is today! Confirm your attendance by tapping the
                    button below before <strong>10:00 AM</strong>. If you don&apos;t
                    check in by then, your appointment will be automatically
                    cancelled.
                  </p>
                  <Button
                    className="mt-4 bg-orange-600 px-8 text-base font-bold hover:bg-orange-700"
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    {checkingIn ? 'Checking In...' : 'Check In — Confirm Attendance'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Checked in success */}
        {checkedIn && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="flex items-center gap-3 p-5">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
              <div>
                <p className="text-sm font-bold text-green-900">
                  Checked In Successfully
                </p>
                <p className="text-xs text-green-700">
                  You&apos;ve confirmed your attendance for today. The admin team
                  has been notified that you&apos;re on your way. See you at{' '}
                  {appointment.startTime}!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Missed check-in warning */}
        {missedCheckIn && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 p-5">
              <AlertTriangle className="h-6 w-6 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-bold text-red-900">
                  Check-in Window Closed
                </p>
                <p className="text-xs text-red-700">
                  The 10:00 AM check-in deadline has passed. Your appointment may be
                  cancelled. Please reschedule with at least 24-hour notice.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Disclaimers */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div className="text-xs leading-relaxed text-blue-800">
                <p className="mb-2 text-sm font-bold text-blue-900">
                  Important Information
                </p>
                <ul className="list-disc space-y-1.5 pl-4">
                  <li>
                    On the morning of your appointment, you must check in by{' '}
                    <strong>10:00 AM</strong>. If you don&apos;t, your appointment
                    will be automatically cancelled.
                  </li>
                  <li>
                    Cancelled appointments can be rescheduled with at least{' '}
                    <strong>24-hour advance notice</strong>.
                  </li>
                  <li>
                    Creating an account gives you full access to manage appointments,
                    receive reminders, book commissary space, and more.
                  </li>
                  <li>
                    <strong>Bookmark this page</strong> to return and check in on
                    your appointment day.
                  </li>
                  <li>
                    If you create an account and sign in, your appointment and
                    check-in status will be automatically transferred to your vendor
                    profile.
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account creation CTA */}
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-base font-bold text-gray-900">
              Create an Account for Full Access
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              With an account you can manage all your appointments, book commissary
              space, receive notifications, and check in from your vendor dashboard.
            </p>
            <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/signup">
                <Button>
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline">Sign In</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="mt-8 border-t bg-white py-6">
        <div className="mx-auto max-w-3xl px-4 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Food Truck Arena Commissary. All rights
          reserved.
        </div>
      </footer>
    </div>
  );
}
