'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { ResourceType } from '@/lib/types';
import {
  Minus,
  Plus,
  Table2,
  Refrigerator,
  Snowflake,
  Car,
  Package,
  Droplets,
  type LucideIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResourceSelectorProps {
  resourceTypes: ResourceType[];
  selectedResources: Record<string, number>;
  onChange: (resources: Record<string, number>) => void;
  /** The date for which we are checking availability. */
  date: string;
  /** Start time in HH:MM format. */
  startTime: string;
  /** End time in HH:MM format. */
  endTime: string;
  /** Map of resourceTypeId -> remaining count available in the selected time window. */
  availabilityMap?: Record<string, number>;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Icon resolver
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  Table2,
  Refrigerator,
  Snowflake,
  Car,
  Package,
  Droplets,
};

function getIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] ?? Package;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResourceSelector({
  resourceTypes,
  selectedResources,
  onChange,
  date,
  startTime,
  endTime,
  availabilityMap = {},
  loading = false,
}: ResourceSelectorProps) {
  const hasTimeSelected = Boolean(date && startTime && endTime);

  const handleIncrement = (typeId: string, max: number) => {
    const current = selectedResources[typeId] ?? 0;
    if (current < max) {
      onChange({ ...selectedResources, [typeId]: current + 1 });
    }
  };

  const handleDecrement = (typeId: string) => {
    const current = selectedResources[typeId] ?? 0;
    if (current > 0) {
      const updated = { ...selectedResources };
      updated[typeId] = current - 1;
      if (updated[typeId] === 0) {
        delete updated[typeId];
      }
      onChange(updated);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Label>Additional Resources</Label>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg bg-gray-100"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Additional Resources</Label>

      {!hasTimeSelected && (
        <p className="text-xs text-gray-400">
          Select a date and time range to see resource availability.
        </p>
      )}

      <div className="space-y-2">
        {resourceTypes.map((type) => {
          const IconComponent = getIcon(type.icon);
          const available = availabilityMap[type.id] ?? type.totalQuantity;
          const selected = selectedResources[type.id] ?? 0;
          const maxSelectable = available;
          const isDisabled = !hasTimeSelected || available === 0;

          return (
            <div
              key={type.id}
              className={cn(
                'flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 transition-colors',
                isDisabled ? 'bg-gray-50 opacity-60' : 'bg-white',
              )}
            >
              {/* Left: icon + name + availability */}
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${type.color}20` }}
                >
                  <IconComponent
                    className="h-5 w-5"
                    style={{ color: type.color }}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {type.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {hasTimeSelected
                      ? `${available} of ${type.totalQuantity} available`
                      : `${type.totalQuantity} total`}
                  </p>
                </div>
              </div>

              {/* Right: +/- controls */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDecrement(type.id)}
                  disabled={isDisabled || selected === 0}
                  aria-label={`Decrease ${type.name}`}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>

                <span className="w-6 text-center text-sm font-semibold tabular-nums">
                  {selected}
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleIncrement(type.id, maxSelectable)}
                  disabled={isDisabled || selected >= maxSelectable}
                  aria-label={`Increase ${type.name}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
