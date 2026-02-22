'use client';

import React, { useState } from 'react';
import { Plus, Trash2, CalendarOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { BlackoutDate } from '@/lib/types';

interface BlackoutDateManagerProps {
  blackoutDates: BlackoutDate[];
  onAdd: (blackout: BlackoutDate) => void;
  onRemove: (date: string) => void;
}

export function BlackoutDateManager({
  blackoutDates,
  onAdd,
  onRemove,
}: BlackoutDateManagerProps) {
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');

  const handleAdd = () => {
    if (!newDate || !newReason) return;

    onAdd({ date: newDate, reason: newReason });
    setNewDate('');
    setNewReason('');
  };

  const sortedDates = [...blackoutDates].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const isPast = (dateStr: string) => {
    return new Date(dateStr) < new Date(new Date().toISOString().split('T')[0]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarOff className="h-5 w-5 text-red-500" />
          Blackout Dates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Blackout */}
        <div className="rounded-lg border border-gray-200 p-4 space-y-3">
          <h4 className="text-sm font-medium">Add Blackout Date</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="blackout-date" className="text-xs">
                Date
              </Label>
              <Input
                id="blackout-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="blackout-reason" className="text-xs">
                Reason
              </Label>
              <div className="flex gap-2">
                <Input
                  id="blackout-reason"
                  placeholder="e.g., Holiday, Maintenance day..."
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAdd();
                    }
                  }}
                />
                <Button
                  onClick={handleAdd}
                  disabled={!newDate || !newReason}
                  size="default"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Existing Blackout Dates */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Scheduled Blackout Dates ({sortedDates.length})
          </h4>

          {sortedDates.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No blackout dates configured.
            </p>
          ) : (
            <div className="space-y-2">
              {sortedDates.map((blackout) => (
                <div
                  key={blackout.date}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-sm font-semibold">
                        {new Date(blackout.date + 'T00:00:00').toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric' }
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(blackout.date + 'T00:00:00').toLocaleDateString(
                          'en-US',
                          { year: 'numeric' }
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm">{blackout.reason}</p>
                      {isPast(blackout.date) && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          Past
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onRemove(blackout.date)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
