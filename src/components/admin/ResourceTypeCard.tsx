'use client';

import React from 'react';
import {
  LayoutGrid,
  Refrigerator,
  Snowflake,
  Package,
  Box,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import type { ResourceType } from '@/lib/types';

interface ResourceTypeCardProps {
  resourceType: ResourceType;
  resourceCount: number;
  inUseCount?: number;
  onClick?: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  table: LayoutGrid,
  fridge: Refrigerator,
  freezer: Snowflake,
  storage: Package,
};

export function ResourceTypeCard({
  resourceType,
  resourceCount,
  inUseCount = 0,
  onClick,
}: ResourceTypeCardProps) {
  const Icon = iconMap[resourceType.slug] || Box;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]',
        onClick && 'hover:border-gray-300'
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 p-6">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${resourceType.color}20` }}
        >
          <Icon className="h-7 w-7" style={{ color: resourceType.color }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">
            {resourceType.name}
          </p>
          <p className="text-2xl font-bold">{resourceCount}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: resourceType.color }}
            />
            <span className="text-xs text-gray-500">
              {inUseCount} in use
            </span>
            <span className="text-xs text-gray-300">|</span>
            <span className="text-xs text-gray-500">
              {resourceCount - inUseCount} available
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
