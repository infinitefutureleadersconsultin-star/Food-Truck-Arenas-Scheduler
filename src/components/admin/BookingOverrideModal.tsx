'use client';

import React, { useState } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import type { User, ResourceType } from '@/lib/types';

interface BookingOverrideModalProps {
  open: boolean;
  onClose: () => void;
  date?: string;
  tableId?: string;
  vendors?: User[];
  resourceTypes?: ResourceType[];
  onSubmit?: (data: {
    vendorId: string;
    date: string;
    startTime: string;
    endTime: string;
    resources: Record<string, number>;
    notes: string;
  }) => void;
}

export function BookingOverrideModal({
  open,
  onClose,
  date: initialDate,
  tableId,
  vendors = [],
  resourceTypes = [],
  onSubmit,
}: BookingOverrideModalProps) {
  const [vendorId, setVendorId] = useState('');
  const [date, setDate] = useState(initialDate || '');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [resources, setResources] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResourceChange = (typeId: string, value: string) => {
    const numValue = parseInt(value, 10);
    setResources((prev) => ({
      ...prev,
      [typeId]: isNaN(numValue) ? 0 : numValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit?.({
        vendorId,
        date,
        startTime,
        endTime,
        resources,
        notes,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Admin Booking Override</DialogTitle>
            <Badge className="bg-orange-100 text-orange-800">
              <Shield className="mr-1 h-3 w-3" />
              Override
            </Badge>
          </div>
          <DialogDescription>
            Create a booking bypassing all scheduling rules. This action is
            logged.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
          <p className="text-sm text-orange-700">
            Override bookings bypass capacity limits, time restrictions, and
            vendor eligibility checks.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vendor Selector */}
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a vendor..." />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.businessName} ({vendor.displayName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Resources */}
          <div className="space-y-2">
            <Label>Resources</Label>
            <div className="grid grid-cols-2 gap-3">
              {resourceTypes.map((type) => (
                <div key={type.id} className="space-y-1">
                  <Label htmlFor={`resource-${type.id}`} className="text-xs text-gray-500">
                    {type.name}
                  </Label>
                  <Input
                    id={`resource-${type.id}`}
                    type="number"
                    min="0"
                    value={resources[type.id] || 0}
                    onChange={(e) =>
                      handleResourceChange(type.id, e.target.value)
                    }
                  />
                </div>
              ))}
            </div>
            {tableId && (
              <p className="text-xs text-gray-500">
                Pre-selected table: {tableId}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Admin Notes</Label>
            <Textarea
              id="notes"
              placeholder="Reason for override..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!vendorId || !date || isSubmitting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? 'Creating...' : 'Force Create Booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
