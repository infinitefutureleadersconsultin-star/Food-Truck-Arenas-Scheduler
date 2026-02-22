'use client';

import React from 'react';
import { Edit2, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/cn';
import type { Resource, ResourceStatus } from '@/lib/types';

interface IndividualResourceRowProps {
  resource: Resource;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onEdit: () => void;
  onStatusChange: (status: ResourceStatus) => void;
}

const statusBadgeVariants: Record<ResourceStatus, string> = {
  available: 'bg-green-100 text-green-800',
  in_use: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  broken: 'bg-red-100 text-red-800',
  locked: 'bg-gray-100 text-gray-800',
};

const statusOptions: { value: ResourceStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'broken', label: 'Broken' },
  { value: 'locked', label: 'Locked' },
];

export function IndividualResourceRow({
  resource,
  isSelected = false,
  onToggleSelect,
  onEdit,
  onStatusChange,
}: IndividualResourceRowProps) {
  return (
    <TableRow className={cn(isSelected && 'bg-blue-50')}>
      <TableCell className="w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="rounded border-gray-300"
        />
      </TableCell>
      <TableCell className="font-medium">{resource.name}</TableCell>
      <TableCell className="text-gray-500">{resource.label}</TableCell>
      <TableCell>
        <Badge
          className={cn(
            'capitalize',
            statusBadgeVariants[resource.status] || 'bg-gray-100 text-gray-800'
          )}
        >
          {resource.status.replace('_', ' ')}
        </Badge>
      </TableCell>
      <TableCell className="text-gray-500">
        {resource.locationDescription || '-'}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {statusOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  disabled={resource.status === option.value}
                  onClick={() => onStatusChange(option.value)}
                >
                  <span
                    className={cn(
                      'mr-2 h-2 w-2 rounded-full',
                      option.value === 'available' && 'bg-green-500',
                      option.value === 'maintenance' && 'bg-yellow-500',
                      option.value === 'broken' && 'bg-red-500',
                      option.value === 'locked' && 'bg-gray-500'
                    )}
                  />
                  Set {option.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="mr-2 h-3 w-3" />
                Edit Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
