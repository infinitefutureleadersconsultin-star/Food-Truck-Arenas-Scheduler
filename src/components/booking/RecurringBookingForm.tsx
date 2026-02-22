'use client';

import { useCallback, useMemo, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate, formatTime } from '@/lib/utils/dateUtils';
import { DEFAULT_BOOKING_RULES } from '@/lib/utils/constants';
import type { Booking, RecurringFrequency, RecurringPattern } from '@/lib/types';
import {
  addDays,
  addWeeks,
  addMonths,
  format,
  parseISO,
  isBefore,
  isAfter,
} from 'date-fns';
import {
  Calendar,
  Repeat,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecurringBookingFormProps {
  baseBooking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>;
  onSubmit: (pattern: RecurringPattern) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generatePreviewDates(
  startDate: string,
  frequency: RecurringFrequency,
  daysOfWeek: number[],
  endDate: string,
): string[] {
  const dates: string[] = [];
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  let current = new Date(start);
  const maxDates = 52; // Safety limit

  while (
    (isBefore(current, end) || current.getTime() === end.getTime()) &&
    dates.length < maxDates
  ) {
    const dayOfWeek = current.getDay();

    if (
      daysOfWeek.length === 0 ||
      daysOfWeek.includes(dayOfWeek)
    ) {
      dates.push(format(current, 'yyyy-MM-dd'));
    }

    switch (frequency) {
      case 'daily':
        current = addDays(current, 1);
        break;
      case 'weekly':
        current = addDays(current, 1);
        if (
          daysOfWeek.length > 0 &&
          dayOfWeek === Math.max(...daysOfWeek)
        ) {
          const daysUntilNext =
            7 - dayOfWeek + Math.min(...daysOfWeek);
          current = addDays(current, daysUntilNext - 1);
        }
        break;
      case 'biweekly':
        current = addDays(current, 1);
        if (
          daysOfWeek.length > 0 &&
          dayOfWeek === Math.max(...daysOfWeek)
        ) {
          const daysUntilNext =
            14 - dayOfWeek + Math.min(...daysOfWeek);
          current = addDays(current, daysUntilNext - 1);
        }
        break;
      case 'monthly':
        current = addMonths(current, 1);
        break;
      default:
        current = addDays(current, 1);
    }
  }

  return dates;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecurringBookingForm({
  baseBooking,
  onSubmit,
}: RecurringBookingFormProps) {
  // ---- State ----
  const [frequency, setFrequency] = useState<RecurringFrequency>('weekly');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(() => {
    const baseDate = parseISO(baseBooking.date);
    return [baseDate.getDay()];
  });
  const [endDate, setEndDate] = useState(() => {
    const maxWeeks = DEFAULT_BOOKING_RULES.maxRecurringWeeks;
    const start = parseISO(baseBooking.date);
    return format(addWeeks(start, maxWeeks), 'yyyy-MM-dd');
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Derived ----
  const showDaysOfWeek = frequency === 'weekly' || frequency === 'biweekly';

  const previewDates = useMemo(
    () =>
      generatePreviewDates(baseBooking.date, frequency, daysOfWeek, endDate),
    [baseBooking.date, frequency, daysOfWeek, endDate],
  );

  const maxEndDate = useMemo(() => {
    const start = parseISO(baseBooking.date);
    return format(
      addWeeks(start, DEFAULT_BOOKING_RULES.maxRecurringWeeks),
      'yyyy-MM-dd',
    );
  }, [baseBooking.date]);

  // ---- Handlers ----
  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleSubmit = async () => {
    if (previewDates.length === 0) {
      setError('No dates match the selected pattern.');
      return;
    }

    if (isAfter(parseISO(endDate), parseISO(maxEndDate))) {
      setError(
        `End date cannot be more than ${DEFAULT_BOOKING_RULES.maxRecurringWeeks} weeks from the start.`,
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const pattern: RecurringPattern = {
        frequency,
        daysOfWeek: showDaysOfWeek ? daysOfWeek : [],
        endDate,
      };

      await onSubmit(pattern);
      setSubmitted(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create recurring bookings.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Success state ----
  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Recurring Bookings Created!
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {previewDates.length} bookings have been created.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Repeat className="h-5 w-5" />
          Recurring Booking
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Base booking summary */}
        <div className="rounded-lg bg-gray-50 p-3 space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Base Booking
          </p>
          <p className="text-sm font-medium">
            {formatDate(baseBooking.date)} &mdash;{' '}
            {formatTime(baseBooking.startTime)} -{' '}
            {formatTime(baseBooking.endTime)}
          </p>
          <p className="text-xs text-gray-500">
            {baseBooking.businessName}
          </p>
        </div>

        <Separator />

        {/* Frequency */}
        <div className="space-y-2">
          <Label htmlFor="frequency">Frequency</Label>
          <Select
            value={frequency}
            onValueChange={(value) =>
              setFrequency(value as RecurringFrequency)
            }
          >
            <SelectTrigger id="frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Days of Week (for weekly/biweekly) */}
        {showDaysOfWeek && (
          <div className="space-y-2">
            <Label>Days of Week</Label>
            <div className="flex gap-1.5">
              {DAY_NAMES.map((name, idx) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-colors',
                    daysOfWeek.includes(idx)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                  aria-label={name}
                  aria-pressed={daysOfWeek.includes(idx)}
                >
                  {name.charAt(0)}
                </button>
              ))}
            </div>
            {daysOfWeek.length === 0 && (
              <p className="text-xs text-amber-600">
                Select at least one day.
              </p>
            )}
          </div>
        )}

        {/* End Date */}
        <div className="space-y-2">
          <Label htmlFor="end-date">End Date</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={baseBooking.date}
            max={maxEndDate}
          />
          <p className="text-xs text-gray-400">
            Maximum {DEFAULT_BOOKING_RULES.maxRecurringWeeks} weeks from
            start date.
          </p>
        </div>

        <Separator />

        {/* Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Preview</Label>
            <Badge variant="secondary">{previewDates.length} bookings</Badge>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200">
            {previewDates.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-gray-400">
                No dates match this pattern.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {previewDates.map((d, idx) => (
                  <li
                    key={d}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-5 text-right">
                        {idx + 1}.
                      </span>
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span>{formatDate(d)}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatTime(baseBooking.startTime)} -{' '}
                      {formatTime(baseBooking.endTime)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              previewDates.length === 0 ||
              (showDaysOfWeek && daysOfWeek.length === 0)
            }
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating {previewDates.length} bookings...
              </>
            ) : (
              <>
                <Repeat className="h-4 w-4" />
                Create {previewDates.length} Bookings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
