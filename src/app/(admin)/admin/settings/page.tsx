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
import { NotificationPreferencesPanel } from '@/components/shared/PushNotificationToggle';
import { useSettings } from '@/lib/hooks/useSettings';
import { addBlackoutDate, removeBlackoutDate } from '@/lib/services/settingsService';
import { useAuthContext } from '@/contexts/AuthContext';
import type { BlackoutDate } from '@/lib/types';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SettingsPage() {
  const { user } = useAuthContext();
  const { settings, loading, error, updateSettings } = useSettings();
  const [saving, setSaving] = useState(false);

  // Local form state — initialised from settings once loaded
  const [facilityName, setFacilityName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [checkInWindow, setCheckInWindow] = useState(15);
  const [noShowThreshold, setNoShowThreshold] = useState(30);
  const [formInitialised, setFormInitialised] = useState(false);

  // Sync settings → local form once
  if (settings && !formInitialised) {
    setFacilityName(settings.facilityName ?? '');
    setAddress(settings.address ?? '');
    setPhone(settings.phone ?? '');
    setEmail(settings.email ?? '');
    setCheckInWindow(settings.checkInWindow ?? 15);
    setNoShowThreshold(settings.noShowThreshold ?? 30);
    setFormInitialised(true);
  }

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateSettings(
        {
          facilityName,
          address,
          phone,
          email,
          checkInWindow,
          noShowThreshold,
        },
        user.uid
      );
    } finally {
      setSaving(false);
    }
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
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
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

      {/* Operating Hours (read-only display) */}
      {settings?.operatingHours && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Operating Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {DAY_LABELS.map((day) => {
                const key = day.toLowerCase();
                const hours = settings.operatingHours[key];
                return (
                  <div
                    key={day}
                    className="flex items-center justify-between rounded-lg border px-4 py-2"
                  >
                    <span className="text-sm font-medium w-28">{day}</span>
                    {hours?.isOpen ? (
                      <span className="text-sm text-gray-600">
                        {hours.openTime} &ndash; {hours.closeTime}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Rules (read-only display) */}
      {settings?.bookingRules && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Booking Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border px-4 py-3">
                <p className="text-xs text-gray-500">Min Duration</p>
                <p className="font-semibold">{settings.bookingRules.minBookingDuration} min</p>
              </div>
              <div className="rounded-lg border px-4 py-3">
                <p className="text-xs text-gray-500">Max Duration</p>
                <p className="font-semibold">{settings.bookingRules.maxBookingDuration} min</p>
              </div>
              <div className="rounded-lg border px-4 py-3">
                <p className="text-xs text-gray-500">Booking Cutoff</p>
                <p className="font-semibold">{settings.bookingRules.bookingCutoffHours} hrs before</p>
              </div>
              <div className="rounded-lg border px-4 py-3">
                <p className="text-xs text-gray-500">Cancellation Cutoff</p>
                <p className="font-semibold">{settings.bookingRules.cancellationCutoffHours} hrs before</p>
              </div>
              <div className="rounded-lg border px-4 py-3">
                <p className="text-xs text-gray-500">Max Advance Booking</p>
                <p className="font-semibold">{settings.bookingRules.maxAdvanceBookingDays} days</p>
              </div>
              <div className="rounded-lg border px-4 py-3">
                <p className="text-xs text-gray-500">Max Vendors / Slot</p>
                <p className="font-semibold">{settings.bookingRules.maxVendorsPerSlot}</p>
              </div>
              <div className="rounded-lg border px-4 py-3 flex items-center justify-between">
                <p className="text-xs text-gray-500">Auto-confirm</p>
                <Switch checked={settings.bookingRules.autoConfirm} disabled />
              </div>
              <div className="rounded-lg border px-4 py-3 flex items-center justify-between">
                <p className="text-xs text-gray-500">Allow Recurring</p>
                <Switch checked={settings.bookingRules.allowRecurring} disabled />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Push Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationPreferencesPanel />
        </CardContent>
      </Card>

      <Separator />

      {/* Blackout Dates */}
      <BlackoutDateManager
        blackoutDates={settings?.blackoutDates ?? []}
        onAdd={handleAddBlackout}
        onRemove={handleRemoveBlackout}
      />
    </div>
  );
}
