'use client';

import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';

interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  className,
}: DateRangePickerProps) {
  const handleFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ from: e.target.value, to });
    },
    [to, onChange]
  );

  const handleToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ from, to: e.target.value });
    },
    [from, onChange]
  );

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end', className)}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="date-from">From</Label>
        <Input
          id="date-from"
          type="date"
          value={from}
          onChange={handleFromChange}
          max={to || undefined}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="date-to">To</Label>
        <Input
          id="date-to"
          type="date"
          value={to}
          onChange={handleToChange}
          min={from || undefined}
        />
      </div>
    </div>
  );
}
