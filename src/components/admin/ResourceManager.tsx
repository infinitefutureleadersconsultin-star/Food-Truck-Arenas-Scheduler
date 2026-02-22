'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Edit2, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils/cn';
import type { ResourceType, Resource, ResourceStatus } from '@/lib/types';
import { IndividualResourceRow } from './IndividualResourceRow';

interface ResourceManagerProps {
  resourceType: ResourceType;
  resources: Resource[];
  onAddResource?: () => void;
  onEditResource?: (resource: Resource) => void;
  onStatusChange?: (resourceId: string, status: ResourceStatus) => void;
  onBulkEdit?: (resourceIds: string[]) => void;
}

export function ResourceManager({
  resourceType,
  resources,
  onAddResource,
  onEditResource,
  onStatusChange,
  onBulkEdit,
}: ResourceManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const inUseCount = resources.filter((r) => r.status === 'in_use').length;
  const availableCount = resources.filter((r) => r.status === 'available').length;
  const maintenanceCount = resources.filter(
    (r) => r.status === 'maintenance'
  ).length;

  const toggleSelectAll = () => {
    if (selectedIds.length === resources.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(resources.map((r) => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${resourceType.color}20` }}
            >
              <Settings
                className="h-5 w-5"
                style={{ color: resourceType.color }}
              />
            </div>
            <div>
              <CardTitle className="text-base">{resourceType.name}</CardTitle>
              <div className="flex gap-2 mt-1">
                <Badge variant="success" className="text-xs">
                  {availableCount} available
                </Badge>
                <Badge variant="info" className="text-xs">
                  {inUseCount} in use
                </Badge>
                {maintenanceCount > 0 && (
                  <Badge variant="warning" className="text-xs">
                    {maintenanceCount} maintenance
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {resources.length} total
            </span>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <>
                  <span className="text-sm text-gray-500">
                    {selectedIds.length} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onBulkEdit?.(selectedIds)}
                  >
                    <Edit2 className="mr-1 h-3 w-3" />
                    Bulk Edit
                  </Button>
                </>
              )}
            </div>
            <Button size="sm" onClick={onAddResource}>
              <Plus className="mr-1 h-3 w-3" />
              Add Resource
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === resources.length &&
                      resources.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((resource) => (
                <IndividualResourceRow
                  key={resource.id}
                  resource={resource}
                  isSelected={selectedIds.includes(resource.id)}
                  onToggleSelect={() => toggleSelect(resource.id)}
                  onEdit={() => onEditResource?.(resource)}
                  onStatusChange={(status) =>
                    onStatusChange?.(resource.id, status)
                  }
                />
              ))}
              {resources.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-gray-500 py-8"
                  >
                    No resources found. Click &quot;Add Resource&quot; to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}
