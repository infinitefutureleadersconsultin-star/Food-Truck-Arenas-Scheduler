'use client';

import React from 'react';
import { Clock, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils/cn';
import type { AttendanceLog, AttendanceStatus } from '@/lib/types';

interface AttendanceTableProps {
  logs: AttendanceLog[];
  onOverride?: (logId: string) => void;
}

const statusBadgeMap: Record<AttendanceStatus, { label: string; className: string }> = {
  on_time: { label: 'On Time', className: 'bg-green-100 text-green-800' },
  late: { label: 'Late', className: 'bg-yellow-100 text-yellow-800' },
  early_leave: { label: 'Early Leave', className: 'bg-orange-100 text-orange-800' },
  no_show: { label: 'No Show', className: 'bg-red-100 text-red-800' },
  completed: { label: 'Completed', className: 'bg-blue-100 text-blue-800' },
};

function formatTimestamp(ts: { toDate?: () => Date } | null): string {
  if (!ts || !ts.toDate) return '--:--';
  const date = ts.toDate();
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AttendanceTable({ logs, onOverride }: AttendanceTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vendor</TableHead>
          <TableHead>Business</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Scheduled</TableHead>
          <TableHead>Check In</TableHead>
          <TableHead>Check Out</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Late (min)</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => {
          const statusInfo = statusBadgeMap[log.status] || {
            label: log.status,
            className: 'bg-gray-100 text-gray-800',
          };

          return (
            <TableRow key={log.id}>
              <TableCell className="font-medium">{log.userName}</TableCell>
              <TableCell className="text-gray-500">
                {log.businessName}
              </TableCell>
              <TableCell className="text-gray-500">{log.date}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="h-3 w-3 text-gray-400" />
                  {log.scheduledStart} - {log.scheduledEnd}
                </div>
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    'text-sm',
                    log.actualCheckIn ? 'text-green-600' : 'text-gray-400'
                  )}
                >
                  {formatTimestamp(log.actualCheckIn)}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    'text-sm',
                    log.actualCheckOut ? 'text-green-600' : 'text-gray-400'
                  )}
                >
                  {formatTimestamp(log.actualCheckOut)}
                </span>
              </TableCell>
              <TableCell>
                <Badge className={cn('capitalize', statusInfo.className)}>
                  {statusInfo.label}
                </Badge>
              </TableCell>
              <TableCell>
                {log.lateMinutes > 0 ? (
                  <span className="text-sm font-medium text-red-600">
                    +{log.lateMinutes}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">0</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOverride?.(log.id)}
                  title="Override attendance"
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Override
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
        {logs.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={9}
              className="text-center text-sm text-gray-500 py-8"
            >
              No attendance records found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
