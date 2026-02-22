'use client';

import { useState } from 'react';
import {
  Clock,
  Settings,
  CalendarX,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OperatingDay {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface BlackoutEntry {
  id: string;
  date: string;
  reason: string;
}

interface BookingRulesState {
  minBookingDuration: string;
  maxBookingDuration: string;
  bookingCutoffHours: number;
  cancellationCutoffHours: number;
  maxAdvanceBookingDays: number;
  maxVendorsPerSlot: number;
  autoConfirm: boolean;
  allowRecurring: boolean;
}

interface CheckInSettingsState {
  checkInWindow: string;
  noShowThreshold: string;
  autoRelease: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const DEFAULT_OPERATING_HOURS: Record<string, OperatingDay> = {
  Monday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
  Tuesday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
  Wednesday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
  Thursday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
  Friday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
  Saturday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
  Sunday: { isOpen: false, openTime: '08:00', closeTime: '18:00' },
};

const DEFAULT_BOOKING_RULES: BookingRulesState = {
  minBookingDuration: '60',
  maxBookingDuration: '480',
  bookingCutoffHours: 2,
  cancellationCutoffHours: 4,
  maxAdvanceBookingDays: 30,
  maxVendorsPerSlot: 8,
  autoConfirm: true,
  allowRecurring: true,
};

const DEFAULT_CHECKIN: CheckInSettingsState = {
  checkInWindow: '15',
  noShowThreshold: '30',
  autoRelease: true,
};

const DEFAULT_BLACKOUTS: BlackoutEntry[] = [
  { id: '1', date: '2026-07-04', reason: 'Independence Day' },
  { id: '2', date: '2026-12-25', reason: 'Christmas Day' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SchedulingPage() {
  // Operating Hours state
  const [operatingHours, setOperatingHours] = useState<Record<string, OperatingDay>>(
    DEFAULT_OPERATING_HOURS
  );

  // Booking Rules state
  const [bookingRules, setBookingRules] = useState<BookingRulesState>(DEFAULT_BOOKING_RULES);

  // Blackout Dates state
  const [blackoutDates, setBlackoutDates] = useState<BlackoutEntry[]>(DEFAULT_BLACKOUTS);
  const [newBlackoutDate, setNewBlackoutDate] = useState('');
  const [newBlackoutReason, setNewBlackoutReason] = useState('');

  // Check-In Settings state
  const [checkInSettings, setCheckInSettings] = useState<CheckInSettingsState>(DEFAULT_CHECKIN);

  // Save feedback
  const [savedSection, setSavedSection] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Handlers - Operating Hours
  // ---------------------------------------------------------------------------

  const handleDayToggle = (day: string) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], isOpen: !prev[day].isOpen },
    }));
  };

  const handleTimeChange = (day: string, field: 'openTime' | 'closeTime', value: string) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  // ---------------------------------------------------------------------------
  // Handlers - Booking Rules
  // ---------------------------------------------------------------------------

  const handleRuleChange = <K extends keyof BookingRulesState>(
    field: K,
    value: BookingRulesState[K]
  ) => {
    setBookingRules((prev) => ({ ...prev, [field]: value }));
  };

  // ---------------------------------------------------------------------------
  // Handlers - Blackout Dates
  // ---------------------------------------------------------------------------

  const handleAddBlackout = () => {
    if (!newBlackoutDate || !newBlackoutReason.trim()) return;
    const entry: BlackoutEntry = {
      id: `bo-${Date.now()}`,
      date: newBlackoutDate,
      reason: newBlackoutReason.trim(),
    };
    setBlackoutDates((prev) => [...prev, entry].sort((a, b) => a.date.localeCompare(b.date)));
    setNewBlackoutDate('');
    setNewBlackoutReason('');
  };

  const handleRemoveBlackout = (id: string) => {
    setBlackoutDates((prev) => prev.filter((bd) => bd.id !== id));
  };

  // ---------------------------------------------------------------------------
  // Handlers - Check-in Settings
  // ---------------------------------------------------------------------------

  const handleCheckInChange = <K extends keyof CheckInSettingsState>(
    field: K,
    value: CheckInSettingsState[K]
  ) => {
    setCheckInSettings((prev) => ({ ...prev, [field]: value }));
  };

  // ---------------------------------------------------------------------------
  // Save handler (simulated)
  // ---------------------------------------------------------------------------

  const handleSaveSection = (section: string) => {
    setSavedSection(section);
    setTimeout(() => setSavedSection(null), 3000);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">
          Scheduling Rules &amp; Settings
        </h1>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Operating Hours */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Operating Hours
              </CardTitle>
              <CardDescription>
                Set the facility open/close times for each day of the week.
              </CardDescription>
            </div>
            <Button
              onClick={() => handleSaveSection('hours')}
              size="sm"
            >
              {savedSection === 'hours' ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-400" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Hours
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DAYS_OF_WEEK.map((day) => {
              const entry = operatingHours[day];
              return (
                <div key={day} className="flex items-center gap-4">
                  <div className="flex w-36 items-center gap-3">
                    <Switch
                      checked={entry.isOpen}
                      onCheckedChange={() => handleDayToggle(day)}
                      id={`day-${day}`}
                    />
                    <Label
                      htmlFor={`day-${day}`}
                      className={cn(
                        'text-sm font-medium',
                        !entry.isOpen && 'text-gray-400'
                      )}
                    >
                      {day}
                    </Label>
                  </div>
                  {entry.isOpen ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={entry.openTime}
                        onChange={(e) =>
                          handleTimeChange(day, 'openTime', e.target.value)
                        }
                        className="w-28"
                      />
                      <span className="text-sm text-gray-400">to</span>
                      <Input
                        type="time"
                        value={entry.closeTime}
                        onChange={(e) =>
                          handleTimeChange(day, 'closeTime', e.target.value)
                        }
                        className="w-28"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Booking Rules */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                Booking Rules
              </CardTitle>
              <CardDescription>
                Configure limits and policies for vendor bookings.
              </CardDescription>
            </div>
            <Button
              onClick={() => handleSaveSection('rules')}
              size="sm"
            >
              {savedSection === 'rules' ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-400" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Rules
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Min Booking Duration */}
            <div className="space-y-2">
              <Label>Min Booking Duration (minutes)</Label>
              <Select
                value={bookingRules.minBookingDuration}
                onValueChange={(val) => handleRuleChange('minBookingDuration', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                  <SelectItem value="120">120 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Max Booking Duration */}
            <div className="space-y-2">
              <Label>Max Booking Duration (minutes)</Label>
              <Select
                value={bookingRules.maxBookingDuration}
                onValueChange={(val) => handleRuleChange('maxBookingDuration', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="240">240 minutes (4 hrs)</SelectItem>
                  <SelectItem value="360">360 minutes (6 hrs)</SelectItem>
                  <SelectItem value="480">480 minutes (8 hrs)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Booking Cutoff Hours */}
            <div className="space-y-2">
              <Label>Booking Cutoff (hours before)</Label>
              <Input
                type="number"
                value={bookingRules.bookingCutoffHours}
                onChange={(e) =>
                  handleRuleChange(
                    'bookingCutoffHours',
                    parseInt(e.target.value, 10) || 0
                  )
                }
                min={0}
              />
            </div>

            {/* Cancellation Cutoff Hours */}
            <div className="space-y-2">
              <Label>Cancellation Cutoff (hours before)</Label>
              <Input
                type="number"
                value={bookingRules.cancellationCutoffHours}
                onChange={(e) =>
                  handleRuleChange(
                    'cancellationCutoffHours',
                    parseInt(e.target.value, 10) || 0
                  )
                }
                min={0}
              />
            </div>

            {/* Max Advance Booking Days */}
            <div className="space-y-2">
              <Label>Max Advance Booking (days)</Label>
              <Input
                type="number"
                value={bookingRules.maxAdvanceBookingDays}
                onChange={(e) =>
                  handleRuleChange(
                    'maxAdvanceBookingDays',
                    parseInt(e.target.value, 10) || 1
                  )
                }
                min={1}
              />
            </div>

            {/* Max Vendors Per Slot */}
            <div className="space-y-2">
              <Label>Max Vendors Per Slot</Label>
              <Input
                type="number"
                value={bookingRules.maxVendorsPerSlot}
                onChange={(e) =>
                  handleRuleChange(
                    'maxVendorsPerSlot',
                    parseInt(e.target.value, 10) || 1
                  )
                }
                min={1}
              />
            </div>
          </div>

          <Separator className="my-6" />

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-confirm Bookings</p>
                <p className="text-xs text-gray-500">
                  Automatically confirm bookings without admin approval.
                </p>
              </div>
              <Switch
                checked={bookingRules.autoConfirm}
                onCheckedChange={(val) => handleRuleChange('autoConfirm', val)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Allow Recurring Bookings</p>
                <p className="text-xs text-gray-500">
                  Let vendors create recurring booking patterns.
                </p>
              </div>
              <Switch
                checked={bookingRules.allowRecurring}
                onCheckedChange={(val) => handleRuleChange('allowRecurring', val)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Blackout Dates */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarX className="h-5 w-5" />
                Blackout Dates
              </CardTitle>
              <CardDescription>
                Dates when no bookings are allowed.
              </CardDescription>
            </div>
            <Button
              onClick={() => handleSaveSection('blackouts')}
              size="sm"
            >
              {savedSection === 'blackouts' ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-400" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Blackouts
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add blackout form */}
          <div className="flex items-end gap-3 mb-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={newBlackoutDate}
                onChange={(e) => setNewBlackoutDate(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Reason</Label>
              <Input
                placeholder="e.g. Holiday, Maintenance..."
                value={newBlackoutReason}
                onChange={(e) => setNewBlackoutReason(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAddBlackout}
              disabled={!newBlackoutDate || !newBlackoutReason.trim()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>

          <Separator className="my-4" />

          {/* Existing blackout dates */}
          {blackoutDates.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              No blackout dates configured.
            </p>
          ) : (
            <div className="space-y-2">
              {blackoutDates.map((bd) => (
                <div
                  key={bd.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-700">{bd.date}</p>
                    <p className="text-xs text-gray-500">{bd.reason}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveBlackout(bd.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Check-In Settings */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5" />
                Check-In Settings
              </CardTitle>
              <CardDescription>
                Configure check-in windows and no-show thresholds.
              </CardDescription>
            </div>
            <Button
              onClick={() => handleSaveSection('checkin')}
              size="sm"
            >
              {savedSection === 'checkin' ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-400" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Check-In
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Check-in Window */}
            <div className="space-y-2">
              <Label>Check-In Window (minutes before start)</Label>
              <Select
                value={checkInSettings.checkInWindow}
                onValueChange={(val) => handleCheckInChange('checkInWindow', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select window" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                How early vendors can check in before their booking starts.
              </p>
            </div>

            {/* No-Show Threshold */}
            <div className="space-y-2">
              <Label>No-Show Threshold (minutes after start)</Label>
              <Select
                value={checkInSettings.noShowThreshold}
                onValueChange={(val) => handleCheckInChange('noShowThreshold', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select threshold" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Minutes after start before marking vendor as no-show.
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-Release on No-Show</p>
              <p className="text-xs text-gray-500">
                Automatically release resources when a vendor is marked as no-show.
              </p>
            </div>
            <Switch
              checked={checkInSettings.autoRelease}
              onCheckedChange={(val) => handleCheckInChange('autoRelease', val)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
