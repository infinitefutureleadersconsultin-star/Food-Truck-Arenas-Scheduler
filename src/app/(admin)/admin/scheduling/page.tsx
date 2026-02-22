'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  Settings,
  CalendarX,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Loader2,
  AlertTriangle,
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
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useSettings } from '@/lib/hooks/useSettings';
import { useAuthContext } from '@/contexts/AuthContext';
import { addBlackoutDate, removeBlackoutDate } from '@/lib/services/settingsService';
import { cn } from '@/lib/utils/cn';
import type { OperatingHoursEntry, BookingRules, BlackoutDate } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const DAY_DISPLAY: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SchedulingPage() {
  const { user } = useAuthContext();
  const { settings, loading, error, updateSettings } = useSettings();

  // Local form state
  const [operatingHours, setOperatingHours] = useState<Record<string, OperatingHoursEntry>>({});
  const [bookingRules, setBookingRules] = useState<Partial<BookingRules>>({});
  const [checkInWindow, setCheckInWindow] = useState('15');
  const [noShowThreshold, setNoShowThreshold] = useState('30');
  const [formInitialised, setFormInitialised] = useState(false);

  // Blackout date form
  const [newBlackoutDate, setNewBlackoutDate] = useState('');
  const [newBlackoutReason, setNewBlackoutReason] = useState('');

  // Save state
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<string | null>(null);

  // Sync settings → local form once loaded
  useEffect(() => {
    if (settings && !formInitialised) {
      setOperatingHours(settings.operatingHours ?? {});
      setBookingRules(settings.bookingRules ?? {});
      setCheckInWindow(String(settings.checkInWindow ?? 15));
      setNoShowThreshold(String(settings.noShowThreshold ?? 30));
      setFormInitialised(true);
    }
  }, [settings, formInitialised]);

  // ---------------------------------------------------------------------------
  // Operating Hours Handlers
  // ---------------------------------------------------------------------------

  const handleDayToggle = (day: string) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day]?.isOpen,
        openTime: prev[day]?.openTime ?? '06:00',
        closeTime: prev[day]?.closeTime ?? '22:00',
      },
    }));
  };

  const handleTimeChange = (day: string, field: 'openTime' | 'closeTime', value: string) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  // ---------------------------------------------------------------------------
  // Booking Rules Handlers
  // ---------------------------------------------------------------------------

  const handleRuleChange = <K extends keyof BookingRules>(field: K, value: BookingRules[K]) => {
    setBookingRules((prev) => ({ ...prev, [field]: value }));
  };

  // ---------------------------------------------------------------------------
  // Save Handlers
  // ---------------------------------------------------------------------------

  const handleSaveSection = async (section: string) => {
    if (!user) return;
    setSavingSection(section);

    try {
      switch (section) {
        case 'hours':
          await updateSettings({ operatingHours }, user.uid);
          break;
        case 'rules':
          await updateSettings({ bookingRules: bookingRules as BookingRules }, user.uid);
          break;
        case 'checkin':
          await updateSettings(
            {
              checkInWindow: parseInt(checkInWindow, 10) || 15,
              noShowThreshold: parseInt(noShowThreshold, 10) || 30,
            },
            user.uid
          );
          break;
      }
      setSavedSection(section);
      setTimeout(() => setSavedSection(null), 3000);
    } catch (err) {
      console.error(`Failed to save ${section}:`, err);
    } finally {
      setSavingSection(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Blackout Date Handlers
  // ---------------------------------------------------------------------------

  const handleAddBlackout = async () => {
    if (!newBlackoutDate || !newBlackoutReason.trim() || !user) return;
    try {
      await addBlackoutDate(newBlackoutDate, newBlackoutReason.trim(), user.uid);
      setNewBlackoutDate('');
      setNewBlackoutReason('');
    } catch (err) {
      console.error('Failed to add blackout date:', err);
    }
  };

  const handleRemoveBlackout = async (blackout: BlackoutDate) => {
    if (!user) return;
    try {
      await removeBlackoutDate(blackout.date, blackout.reason, user.uid);
    } catch (err) {
      console.error('Failed to remove blackout date:', err);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading / Error
  // ---------------------------------------------------------------------------

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
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-red-600">Error loading settings: {error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Save Button Helper
  // ---------------------------------------------------------------------------

  function SaveButton({ section, label }: { section: string; label: string }) {
    const isSaving = savingSection === section;
    const isSaved = savedSection === section;

    return (
      <Button onClick={() => handleSaveSection(section)} size="sm" disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : isSaved ? (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4 text-green-400" />
            Saved!
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            {label}
          </>
        )}
      </Button>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">
          Scheduling Rules &amp; Settings
        </h1>
      </div>

      {/* Operating Hours */}
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
            <SaveButton section="hours" label="Save Hours" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DAYS_OF_WEEK.map((day) => {
              const entry = operatingHours[day] ?? {
                isOpen: false,
                openTime: '06:00',
                closeTime: '22:00',
              };
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
                      {DAY_DISPLAY[day]}
                    </Label>
                  </div>
                  {entry.isOpen ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={entry.openTime}
                        onChange={(e) => handleTimeChange(day, 'openTime', e.target.value)}
                        className="w-28"
                      />
                      <span className="text-sm text-gray-400">to</span>
                      <Input
                        type="time"
                        value={entry.closeTime}
                        onChange={(e) => handleTimeChange(day, 'closeTime', e.target.value)}
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

      {/* Booking Rules */}
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
            <SaveButton section="rules" label="Save Rules" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Min Booking Duration (minutes)</Label>
              <Select
                value={String(bookingRules.minBookingDuration ?? 60)}
                onValueChange={(val) => handleRuleChange('minBookingDuration', parseInt(val, 10))}
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

            <div className="space-y-2">
              <Label>Max Booking Duration (minutes)</Label>
              <Select
                value={String(bookingRules.maxBookingDuration ?? 480)}
                onValueChange={(val) => handleRuleChange('maxBookingDuration', parseInt(val, 10))}
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

            <div className="space-y-2">
              <Label>Booking Cutoff (hours before)</Label>
              <Input
                type="number"
                value={bookingRules.bookingCutoffHours ?? 2}
                onChange={(e) =>
                  handleRuleChange('bookingCutoffHours', parseInt(e.target.value, 10) || 0)
                }
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label>Cancellation Cutoff (hours before)</Label>
              <Input
                type="number"
                value={bookingRules.cancellationCutoffHours ?? 4}
                onChange={(e) =>
                  handleRuleChange('cancellationCutoffHours', parseInt(e.target.value, 10) || 0)
                }
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label>Max Advance Booking (days)</Label>
              <Input
                type="number"
                value={bookingRules.maxAdvanceBookingDays ?? 30}
                onChange={(e) =>
                  handleRuleChange('maxAdvanceBookingDays', parseInt(e.target.value, 10) || 1)
                }
                min={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Max Vendors Per Slot</Label>
              <Input
                type="number"
                value={bookingRules.maxVendorsPerSlot ?? 8}
                onChange={(e) =>
                  handleRuleChange('maxVendorsPerSlot', parseInt(e.target.value, 10) || 1)
                }
                min={1}
              />
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-confirm Bookings</p>
                <p className="text-xs text-gray-500">
                  Automatically confirm bookings without admin approval.
                </p>
              </div>
              <Switch
                checked={bookingRules.autoConfirm ?? true}
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
                checked={bookingRules.allowRecurring ?? true}
                onCheckedChange={(val) => handleRuleChange('allowRecurring', val)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blackout Dates */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarX className="h-5 w-5" />
              Blackout Dates
            </CardTitle>
            <CardDescription>
              Dates when no bookings are allowed.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
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

          {(!settings?.blackoutDates || settings.blackoutDates.length === 0) ? (
            <p className="py-4 text-center text-sm text-gray-400">
              No blackout dates configured.
            </p>
          ) : (
            <div className="space-y-2">
              {settings.blackoutDates.map((bd, i) => (
                <div
                  key={`${bd.date}-${i}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-700">{bd.date}</p>
                    <p className="text-xs text-gray-500">{bd.reason}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveBlackout(bd)}
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

      {/* Check-In Settings */}
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
            <SaveButton section="checkin" label="Save Check-In" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Check-In Window (minutes before start)</Label>
              <Select
                value={checkInWindow}
                onValueChange={setCheckInWindow}
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

            <div className="space-y-2">
              <Label>No-Show Threshold (minutes after start)</Label>
              <Select
                value={noShowThreshold}
                onValueChange={setNoShowThreshold}
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
        </CardContent>
      </Card>
    </div>
  );
}
