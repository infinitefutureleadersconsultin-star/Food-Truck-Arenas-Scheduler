'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatTime, formatDate } from '@/lib/utils/dateUtils';
import { Clock, Bell, CheckCircle2, Loader2 } from 'lucide-react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WaitlistButtonProps {
  date: string;
  startTime: string;
  endTime: string;
  resourceRequests: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WaitlistButton({
  date,
  startTime,
  endTime,
  resourceRequests,
}: WaitlistButtonProps) {
  const { userData } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const handleJoinWaitlist = async () => {
    if (!userData) {
      setError('You must be logged in to join the waitlist.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, 'waitlist'), {
        userId: userData.id,
        userName: userData.displayName,
        businessName: userData.businessName,
        date,
        preferredStartTime: startTime,
        preferredEndTime: endTime,
        resourceRequests,
        status: 'waiting',
        notes,
        notifiedAt: null,
        createdAt: Timestamp.now(),
      });

      setJoined(true);
      // Close the dialog after a short delay
      setTimeout(() => {
        setOpen(false);
      }, 2000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to join waitlist.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Already joined state renders as a static badge
  if (joined) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <div>
          <p className="text-sm font-medium text-green-800">
            You&apos;re on the waitlist
          </p>
          <p className="text-xs text-green-600">
            We&apos;ll notify you when a spot opens up.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <Bell className="h-4 w-4" />
          Join Waitlist
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Waitlist</DialogTitle>
          <DialogDescription>
            Get notified when this time slot becomes available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Slot details */}
          <div className="rounded-lg bg-gray-50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{formatDate(date)}</span>
            </div>
            <div className="text-sm text-gray-600">
              {startTime && endTime
                ? `${formatTime(startTime)} - ${formatTime(endTime)}`
                : 'Time not specified'}
            </div>
            {Object.keys(resourceRequests).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.entries(resourceRequests).map(([typeId, count]) => (
                  <Badge key={typeId} variant="secondary" className="text-xs">
                    {count}x {typeId}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="waitlist-notes">
              Notes <span className="text-gray-400">(optional)</span>
            </Label>
            <Textarea
              id="waitlist-notes"
              placeholder="Any special requirements or flexibility notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoinWaitlist}
            disabled={submitting}
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                Join Waitlist
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
