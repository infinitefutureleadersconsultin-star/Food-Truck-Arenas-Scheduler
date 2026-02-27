'use client';

import { useState } from 'react';
import { Settings, Save, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { BlackoutDateManager } from '@/components/admin/BlackoutDateManager';
import { useSettings } from '@/lib/hooks/useSettings';
import { addBlackoutDate, removeBlackoutDate } from '@/lib/services/settingsService';
import { useAuthContext } from '@/contexts/AuthContext';
import type { BlackoutDate, OperatingHoursEntry, BookingRules } from '@/lib/types';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_OPERATING_HOURS: Record<string, OperatingHoursEntry> = {
  sunday: { isOpen: false, openTime: '06:00', closeTime: '22:00' },
  monday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
  tuesday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
  wednesday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
  thursday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
  friday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
  saturday: { isOpen: true, openTime: '06:00', closeTime: '22:00' },
};

const DEFAULT_BOOKING_RULES: BookingRules = {
  minBookingDuration: 60,
  maxBookingDuration: 480,
  bookingCutoffHours: 24,
  cancellationCutoffHours: 12,
  maxAdvanceBookingDays: 30,
  maxVendorsPerSlot: 10,
  autoConfirm: true,
  allowRecurring: true,
  maxRecurringWeeks: 12,
};

export default function SettingsPage() {
  const { user } = useAuthContext();
  const { settings, loading, error, updateSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Local form state — initialised from settings once loaded
  const [facilityName, setFacilityName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [checkInWindow, setCheckInWindow] = useState(15);
  const [noShowThreshold, setNoShowThreshold] = useState(30);

  // Operating hours — editable
  const [operatingHours, setOperatingHours] = useState<Record<string, OperatingHoursEntry>>(
    DEFAULT_OPERATING_HOURS
  );

  // Booking rules — editable
  const [bookingRules, setBookingRules] = useState<BookingRules>(DEFAULT_BOOKING_RULES);

  const [formInitialised, setFormInitialised] = useState(false);

  // Sync settings → local form once
  if (settings && !formInitialised) {
    setFacilityName(settings.facilityName ?? '');
    setAddress(settings.address ?? '');
    setPhone(settings.phone ?? '');
    setEmail(settings.email ?? '');
    setCheckInWindow(settings.checkInWindow ?? 15);
    setNoShowThreshold(settings.noShowThreshold ?? 30);
    if (settings.operatingHours) {
      setOperatingHours({ ...DEFAULT_OPERATING_HOURS, ...settings.operatingHours });
    }
    if (settings.bookingRules) {
      setBookingRules({ ...DEFAULT_BOOKING_RULES, ...settings.bookingRules });
    }
    setFormInitialised(true);
  }

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await updateSettings(
        {
          facilityName,
          address,
          phone,
          email,
          checkInWindow,
          noShowThreshold,
          operatingHours,
          bookingRules,
        },
        user.uid
      );
      setSaveMessage('Settings saved successfully! Changes are live for vendors.');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch {
      setSaveMessage('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Operating hours helpers
  const updateDayHours = (day: string, field: keyof OperatingHoursEntry, value: string | boolean) => {
    setOperatingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  // Booking rules helpers
  const updateRule = <K extends keyof BookingRules>(key: K, value: BookingRules[K]) => {
    setBookingRules((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddBlackout = async (blackout: BlackoutDate) => {
    if (!user) return;
    await addBlackoutDate(blackout.date, blackout.reason, user.uid);
  };

  const handleRemoveBlackout = async (date: string) => {
    if (!user) return;
    const match = settings?.blackoutDates?.find((b) => b.date === date);
    if (match) {
      await removeBlackoutDate(date, match.reason, user.uid);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-7 w-7 text-gray-700" />
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span
              className={`text-sm ${
                saveMessage.includes('Error') ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {saveMessage}
            </span>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </div>

      {/* Facility Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Facility Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="facility-name">Facility Name</Label>
              <Input
                id="facility-name"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facility-email">Email</Label>
              <Input
                id="facility-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facility-phone">Phone</Label>
              <Input
                id="facility-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facility-address">Address</Label>
              <Input
                id="facility-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check-in / No-show */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attendance Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="checkin-window">Check-in Window (minutes)</Label>
              <Input
                id="checkin-window"
                type="number"
                min={0}
                value={checkInWindow}
                onChange={(e) => setCheckInWindow(Number(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                How many minutes before their slot vendors can check in.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="noshow-threshold">No-show Threshold (minutes)</Label>
              <Input
                id="noshow-threshold"
                type="number"
                min={0}
                value={noShowThreshold}
                onChange={(e) => setNoShowThreshold(Number(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                Minutes after start time before a vendor is marked as no-show.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operating Hours — Now Editable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Operating Hours</CardTitle>
          <p className="text-sm text-gray-500">
            Set the open/close times for each day. Changes apply to future bookings once saved.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DAY_LABELS.map((day) => {
              const key = day.toLowerCase();
              const hours = operatingHours[key] || { isOpen: false, openTime: '06:00', closeTime: '22:00' };
              return (
                <div
                  key={day}
                  className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
                >
                  <div className="flex items-center gap-3 w-40">
                    <Switch
                      checked={hours.isOpen}
                      onCheckedChange={(checked) => updateDayHours(key, 'isOpen', checked)}
                    />
                    <span className="text-sm font-medium">{day}</span>
                  </div>
                  {hours.isOpen ? (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-gray-500 sr-only">Open</Label>
                      <Input
                        type="time"
                        className="w-32"
                        value={hours.openTime}
                        onChange={(e) => updateDayHours(key, 'openTime', e.target.value)}
                      />
                      <span className="text-gray-400">to</span>
                      <Input
                        type="time"
                        className="w-32"
                        value={hours.closeTime}
                        onChange={(e) => updateDayHours(key, 'closeTime', e.target.value)}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Booking Rules — Now Editable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Booking Rules</CardTitle>
          <p className="text-sm text-gray-500">
            Configure booking durations, cutoffs, and policies. Changes apply immediately once saved.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="min-duration">Min Booking Duration (min)</Label>
              <Input
                id="min-duration"
                type="number"
                min={15}
                step={15}
                value={bookingRules.minBookingDuration}
                onChange={(e) => updateRule('minBookingDuration', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-duration">Max Booking Duration (min)</Label>
              <Input
                id="max-duration"
                type="number"
                min={60}
                step={30}
                value={bookingRules.maxBookingDuration}
                onChange={(e) => updateRule('maxBookingDuration', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-cutoff">Booking Cutoff (hours before)</Label>
              <Input
                id="booking-cutoff"
                type="number"
                min={0}
                value={bookingRules.bookingCutoffHours}
                onChange={(e) => updateRule('bookingCutoffHours', Number(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                How far in advance vendors must book.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancel-cutoff">Cancellation Cutoff (hours before)</Label>
              <Input
                id="cancel-cutoff"
                type="number"
                min={0}
                value={bookingRules.cancellationCutoffHours}
                onChange={(e) => updateRule('cancellationCutoffHours', Number(e.target.value))}
              />
              <p className="text-xs text-gray-500">
                Latest time vendors can cancel without penalty.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="advance-days">Max Advance Booking (days)</Label>
              <Input
                id="advance-days"
                type="number"
                min={1}
                value={bookingRules.maxAdvanceBookingDays}
                onChange={(e) => updateRule('maxAdvanceBookingDays', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-vendors">Max Vendors Per Slot</Label>
              <Input
                id="max-vendors"
                type="number"
                min={1}
                value={bookingRules.maxVendorsPerSlot}
                onChange={(e) => updateRule('maxVendorsPerSlot', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-recurring">Max Recurring Weeks</Label>
              <Input
                id="max-recurring"
                type="number"
                min={1}
                value={bookingRules.maxRecurringWeeks}
                onChange={(e) => updateRule('maxRecurringWeeks', Number(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Auto-confirm Bookings</p>
                <p className="text-xs text-gray-500">Automatically confirm new bookings</p>
              </div>
              <Switch
                checked={bookingRules.autoConfirm}
                onCheckedChange={(checked) => updateRule('autoConfirm', checked)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Allow Recurring</p>
                <p className="text-xs text-gray-500">Let vendors create recurring bookings</p>
              </div>
              <Switch
                checked={bookingRules.allowRecurring}
                onCheckedChange={(checked) => updateRule('allowRecurring', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Blackout Dates */}
      <BlackoutDateManager
        blackoutDates={settings?.blackoutDates ?? []}
        onAdd={handleAddBlackout}
        onRemove={handleRemoveBlackout}
      />

      {/* Bottom Save button for convenience */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
}
