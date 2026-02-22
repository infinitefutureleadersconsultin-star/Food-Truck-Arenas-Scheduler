'use client';

import React from 'react';
import {
  Table2,
  Snowflake,
  Plug,
  Box,
  MapPin,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

interface AssignedResource {
  resourceId: string;
  resourceName: string;
  resourceTypeName?: string;
}

interface AssignedResourcesCardProps {
  resources: AssignedResource[];
}

function getResourceIcon(typeName?: string) {
  const name = (typeName ?? '').toLowerCase();
  if (name.includes('table') || name.includes('space') || name.includes('spot')) {
    return <Table2 className="h-5 w-5 text-blue-500" />;
  }
  if (name.includes('freezer') || name.includes('cold') || name.includes('refriger')) {
    return <Snowflake className="h-5 w-5 text-cyan-500" />;
  }
  if (name.includes('power') || name.includes('electric') || name.includes('outlet')) {
    return <Plug className="h-5 w-5 text-yellow-600" />;
  }
  if (name.includes('storage') || name.includes('locker')) {
    return <Box className="h-5 w-5 text-orange-500" />;
  }
  return <MapPin className="h-5 w-5 text-gray-500" />;
}

function getResourceBgColor(typeName?: string): string {
  const name = (typeName ?? '').toLowerCase();
  if (name.includes('table') || name.includes('space') || name.includes('spot')) {
    return 'bg-blue-50';
  }
  if (name.includes('freezer') || name.includes('cold') || name.includes('refriger')) {
    return 'bg-cyan-50';
  }
  if (name.includes('power') || name.includes('electric') || name.includes('outlet')) {
    return 'bg-yellow-50';
  }
  if (name.includes('storage') || name.includes('locker')) {
    return 'bg-orange-50';
  }
  return 'bg-gray-50';
}

export function AssignedResourcesCard({ resources }: AssignedResourcesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Assigned Resources{resources.length > 0 ? ` (${resources.length})` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {resources.length === 0 ? (
          <p className="text-sm text-gray-500">
            No resources assigned to this booking.
          </p>
        ) : (
          <div className="space-y-3">
            {resources.map((resource) => (
              <div
                key={resource.resourceId}
                className={cn(
                  'flex items-center gap-3 rounded-lg border border-gray-200 p-3'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    getResourceBgColor(resource.resourceTypeName)
                  )}
                >
                  {getResourceIcon(resource.resourceTypeName)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{resource.resourceName}</p>
                  {resource.resourceTypeName && (
                    <p className="text-xs capitalize text-gray-500">
                      {resource.resourceTypeName}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
