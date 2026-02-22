'use client';

import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { CommissarySettings, OperatingHoursEntry } from '@/lib/types';

interface SchedulingRulesFormProps {
  settings: CommissarySettings;
  onSave: (settings: CommissarySettings) => void;
}

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export function SchedulingRulesForm({
  settings,
  onSave,
}: SchedulingRulesFormProps) {
  const [formData, setFormData] = useState<CommissarySettings>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);

  const updateBookingRules = (
    key: keyof CommissarySettings['bookingRules'],
    value: number | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      bookingRules: {
        ...prev.bookingRules,
        [key]: value,
      },
    }));
  };

  const updateOperatingHours = (
    day: string,
    field: keyof OperatingHoursEntry,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value,
        },
      },
    }));
  };

  const updateFacilityInfo = (
    key: 'facilityName' | 'address' | 'phone' | 'email',
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateCheckInSettings = (
    key: 'checkInWindow' | 'noShowThreshold',
    value: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Facility Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Facility Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="facilityName">Facility Name</Label>
              <Input
                id="facilityName"
                value={formData.facilityName}
                onChange={(e) =>
                  updateFacilityInfo('facilityName', e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFacilityInfo('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => updateFacilityInfo('address', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => updateFacilityInfo('phone', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operating Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Operating Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {DAYS_OF_WEEK.map((day) => {
            const hours = formData.operatingHours[day] || {
              isOpen: false,
              openTime: '06:00',
              closeTime: '22:00',
            };

            return (
              <div
                key={day}
                className="flex items-center gap-4 rounded-lg border border-gray-200 p-3"
              >
                <div className="w-28">
                  <span className="text-sm font-medium">
                    {DAY_LABELS[day]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={hours.isOpen}
                    onCheckedChange={(checked) =>
                      updateOperatingHours(day, 'isOpen', checked)
                    }
                  />
                  <span className="text-xs text-gray-500">
                    {hours.isOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
                {hours.isOpen && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={hours.openTime}
                      onChange={(e) =>
                        updateOperatingHours(day, 'openTime', e.target.value)
                      }
                      className="w-32"
                    />
                    <span className="text-sm text-gray-400">to</span>
                    <Input
                      type="time"
                      value={hours.closeTime}
                      onChange={(e) =>
                        updateOperatingHours(day, 'closeTime', e.target.value)
                      }
                      className="w-32"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Booking Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Booking Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minDuration">
                Min Booking Duration (hours)
              </Label>
              <Input
                id="minDuration"
                type="number"
                min="1"
                value={formData.bookingRules.minBookingDuration}
                onChange={(e) =>
                  updateBookingRules(
                    'minBookingDuration',
                    parseInt(e.target.value, 10) || 1
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxDuration">
                Max Booking Duration (hours)
              </Label>
              <Input
                id="maxDuration"
                type="number"
                min="1"
                value={formData.bookingRules.maxBookingDuration}
                onChange={(e) =>
                  updateBookingRules(
                    'maxBookingDuration',
                    parseInt(e.target.value, 10) || 1
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingCutoff">
                Booking Cutoff (hours before)
              </Label>
              <Input
                id="bookingCutoff"
                type="number"
                min="0"
                value={formData.bookingRules.bookingCutoffHours}
                onChange={(e) =>
                  updateBookingRules(
                    'bookingCutoffHours',
                    parseInt(e.target.value, 10) || 0
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancelCutoff">
                Cancellation Cutoff (hours before)
              </Label>
              <Input
                id="cancelCutoff"
                type="number"
                min="0"
                value={formData.bookingRules.cancellationCutoffHours}
                onChange={(e) =>
                  updateBookingRules(
                    'cancellationCutoffHours',
                    parseInt(e.target.value, 10) || 0
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxAdvance">
                Max Advance Booking (days)
              </Label>
              <Input
                id="maxAdvance"
                type="number"
                min="1"
                value={formData.bookingRules.maxAdvanceBookingDays}
                onChange={(e) =>
                  updateBookingRules(
                    'maxAdvanceBookingDays',
                    parseInt(e.target.value, 10) || 1
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxVendors">Max Vendors Per Slot</Label>
              <Input
                id="maxVendors"
                type="number"
                min="1"
                value={formData.bookingRules.maxVendorsPerSlot}
                onChange={(e) =>
                  updateBookingRules(
                    'maxVendorsPerSlot',
                    parseInt(e.target.value, 10) || 1
                  )
                }
              />
            </div>
          </div>

          <Separator />

          {/* Toggle switches */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Confirm Bookings</Label>
                <p className="text-xs text-gray-500">
                  Automatically confirm bookings without admin approval
                </p>
              </div>
              <Switch
                checked={formData.bookingRules.autoConfirm}
                onCheckedChange={(checked) =>
                  updateBookingRules('autoConfirm', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Recurring Bookings</Label>
                <p className="text-xs text-gray-500">
                  Let vendors create recurring booking patterns
                </p>
              </div>
              <Switch
                checked={formData.bookingRules.allowRecurring}
                onCheckedChange={(checked) =>
                  updateBookingRules('allowRecurring', checked)
                }
              />
            </div>

            {formData.bookingRules.allowRecurring && (
              <div className="space-y-2 ml-4">
                <Label htmlFor="maxRecurring">
                  Max Recurring Weeks
                </Label>
                <Input
                  id="maxRecurring"
                  type="number"
                  min="1"
                  max="52"
                  value={formData.bookingRules.maxRecurringWeeks}
                  onChange={(e) =>
                    updateBookingRules(
                      'maxRecurringWeeks',
                      parseInt(e.target.value, 10) || 1
                    )
                  }
                  className="w-32"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Check-in Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Check-in Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="checkInWindow">
                Check-in Window (minutes)
              </Label>
              <Input
                id="checkInWindow"
                type="number"
                min="0"
                value={formData.checkInWindow}
                onChange={(e) =>
                  updateCheckInSettings(
                    'checkInWindow',
                    parseInt(e.target.value, 10) || 0
                  )
                }
              />
              <p className="text-xs text-gray-500">
                Minutes before/after start time to allow check-in
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="noShowThreshold">
                No-Show Threshold (minutes)
              </Label>
              <Input
                id="noShowThreshold"
                type="number"
                min="0"
                value={formData.noShowThreshold}
                onChange={(e) =>
                  updateCheckInSettings(
                    'noShowThreshold',
                    parseInt(e.target.value, 10) || 0
                  )
                }
              />
              <p className="text-xs text-gray-500">
                Minutes after start time to mark as no-show
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
}
