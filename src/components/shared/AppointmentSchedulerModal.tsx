'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils/cn';
import type { AppointmentType } from '@/lib/types';

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

export function AppointmentSchedulerModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Contact info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');

  // Appointment details
  const [apptType, setApptType] = useState<AppointmentType>('walk_through');
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [purpose, setPurpose] = useState('');

  const [error, setError] = useState<string | null>(null);

  // Minimum date is tomorrow (24-hour notice)
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const resetForm = () => {
    setStep(1);
    setName('');
    setEmail('');
    setPhone('');
    setBusinessName('');
    setApptType('walk_through');
    setApptDate('');
    setApptTime('');
    setPurpose('');
    setError(null);
  };

  const handleContactNext = () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !businessName.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSchedule = () => {
    if (!apptDate || !apptTime || !purpose.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    setError(null);

    // Calculate end time (30 min slot)
    const [h, m] = apptTime.split(':').map(Number);
    const endMinutes = h * 60 + m + 30;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    // Save to localStorage for post-auth processing
    const pendingAppointment = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      businessName: businessName.trim(),
      type: apptType,
      purpose: purpose.trim(),
      date: apptDate,
      startTime: apptTime,
      endTime,
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem('pendingAppointment', JSON.stringify(pendingAppointment));
    } catch {
      // localStorage may be unavailable
    }

    setStep(3);
  };

  return (
    <>
      <button
        onClick={() => { resetForm(); setOpen(true); }}
        className="inline-flex items-center gap-2 rounded-xl border-2 border-secondary/30 bg-secondary/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-secondary/20"
      >
        <CalendarCheck className="h-5 w-5" />
        Schedule a Walk-In Appointment
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          {/* Step 1: Contact Info */}
          {step === 1 && (
            <>
              <DialogHeader>
                <DialogTitle>Schedule an Appointment</DialogTitle>
                <DialogDescription>
                  Enter your contact information to get started.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business Name *</Label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your food truck name"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button onClick={handleContactNext} className="w-full">
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Appointment Details */}
          {step === 2 && (
            <>
              <DialogHeader>
                <DialogTitle>Appointment Details</DialogTitle>
                <DialogDescription>
                  Choose your preferred date and time.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-xs text-blue-700">
                    <strong>Note:</strong> Appointments require 24-hour advance
                    notice. On the morning of your appointment, check in by 10:00 AM
                    to confirm.
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
                </div>

                <div className="space-y-2">
                  <Label>Time Slot *</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setApptTime(slot)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                          apptTime === slot
                            ? 'border-primary bg-primary text-white'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-primary hover:bg-primary/5'
                        )}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Purpose / Notes *</Label>
                  <Textarea
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Describe the purpose of your visit..."
                    className="min-h-[60px]"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { setError(null); setStep(1); }}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={handleSchedule} className="flex-1">
                    Schedule Appointment
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <>
              <DialogHeader>
                <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-7 w-7 text-green-600" />
                </div>
                <DialogTitle className="text-center">
                  Appointment Scheduled!
                </DialogTitle>
                <DialogDescription className="text-center">
                  Create an account or sign in to confirm your booking and manage
                  your appointments.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>
                    {apptDate} at {apptTime}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {APPOINTMENT_TYPES.find((t) => t.value === apptType)?.label}
                  {purpose && ` — ${purpose}`}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => { setOpen(false); router.push('/signup'); }}
                  className="w-full"
                >
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setOpen(false); router.push('/login'); }}
                  className="w-full"
                >
                  Sign In
                </Button>
              </div>

              <p className="text-center text-xs text-gray-400">
                Your appointment will be confirmed after you sign in.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
