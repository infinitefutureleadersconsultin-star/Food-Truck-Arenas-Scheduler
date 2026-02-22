'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserCheck,
  ClipboardList,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { Pagination } from '@/components/shared/Pagination';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils/cn';
import {
  getAttendanceStats,
  overrideAttendance,
} from '@/lib/services/attendanceService';
import { formatDate, formatTime } from '@/lib/utils/dateUtils';
import type { AttendanceLog, AttendanceStatus } from '@/lib/types';
import {
  collection,
  query,
  orderBy,
  getDocs,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

const ITEMS_PER_PAGE = 15;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'on_time', label: 'On Time' },
  { value: 'late', label: 'Late' },
  { value: 'no_show', label: 'No Show' },
  { value: 'early_leave', label: 'Early Leave' },
  { value: 'completed', label: 'Completed' },
];

function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const config: Record<
    AttendanceStatus,
    { variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'info'; label: string }
  > = {
    on_time: { variant: 'success', label: 'On Time' },
    late: { variant: 'warning', label: 'Late' },
    no_show: { variant: 'destructive', label: 'No Show' },
    early_leave: { variant: 'info', label: 'Early Leave' },
    completed: { variant: 'secondary', label: 'Completed' },
  };

  const c = config[status] ?? { variant: 'secondary' as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export default function AttendancePage() {
  // Data
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    onTimePercent: number;
    noShowPercent: number;
    latePercent: number;
  } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch attendance data
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'attendance'),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as AttendanceLog
      );
      setLogs(results);

      const statsData = await getAttendanceStats();
      setStats(statsData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load attendance data.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let filtered = [...logs];

    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.userName.toLowerCase().includes(lowerSearch) ||
          l.businessName.toLowerCase().includes(lowerSearch)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((l) => l.status === statusFilter);
    }

    if (dateRange.from) {
      filtered = filtered.filter((l) => l.date >= dateRange.from);
    }
    if (dateRange.to) {
      filtered = filtered.filter((l) => l.date <= dateRange.to);
    }

    return filtered;
  }, [logs, search, statusFilter, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  // Override status
  const handleOverride = useCallback(
    async (logId: string, newStatus: AttendanceStatus) => {
      try {
        await overrideAttendance(logId, newStatus);
        setLogs((prev) =>
          prev.map((l) =>
            l.id === logId ? { ...l, status: newStatus } : l
          )
        );
      } catch (err) {
        console.error('Failed to override status:', err);
      }
    },
    []
  );

  // Export to CSV
  const handleExport = useCallback(() => {
    const headers = [
      'Date',
      'Vendor',
      'Business',
      'Scheduled Start',
      'Scheduled End',
      'Check-In Time',
      'Check-Out Time',
      'Status',
      'Late By (min)',
    ];

    const rows = filteredLogs.map((l) => [
      l.date,
      l.userName,
      l.businessName,
      l.scheduledStart,
      l.scheduledEnd,
      l.actualCheckIn
        ? l.actualCheckIn.toDate().toLocaleTimeString()
        : '',
      l.actualCheckOut
        ? l.actualCheckOut.toDate().toLocaleTimeString()
        : '',
      l.status,
      l.lateMinutes.toString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLogs]);

  // Compute average late time
  const avgLateTime = useMemo(() => {
    const lateLogs = filteredLogs.filter(
      (l) => l.status === 'late' && l.lateMinutes > 0
    );
    if (lateLogs.length === 0) return 0;
    return Math.round(
      lateLogs.reduce((sum, l) => sum + l.lateMinutes, 0) / lateLogs.length
    );
  }, [filteredLogs]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-red-600">Error: {error}</p>
        <Button variant="outline" onClick={fetchAttendance}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Attendance Tracking
        </h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats?.onTimePercent ?? 0}%
                </p>
                <p className="text-sm text-gray-500">Overall Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats?.noShowPercent ?? 0}%
                </p>
                <p className="text-sm text-gray-500">No-Show Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-100 p-2">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgLateTime} min</p>
                <p className="text-sm text-gray-500">Average Late Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
                <p className="text-sm text-gray-500">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <Input
                placeholder="Search by vendor name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="w-full lg:w-48">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DateRangePicker
              from={dateRange.from}
              to={dateRange.to}
              onChange={(range) => {
                setDateRange(range);
                setCurrentPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredLogs.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No attendance records"
              description="No attendance records match your current filters."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Scheduled Time</TableHead>
                    <TableHead>Check-In Time</TableHead>
                    <TableHead>Check-Out Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Late By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(log.date)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.userName}</div>
                          <div className="text-xs text-gray-500">
                            {log.businessName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatTime(log.scheduledStart)} -{' '}
                        {formatTime(log.scheduledEnd)}
                      </TableCell>
                      <TableCell>
                        {log.actualCheckIn
                          ? formatDate(
                              log.actualCheckIn.toDate(),
                              'h:mm a'
                            )
                          : '--'}
                      </TableCell>
                      <TableCell>
                        {log.actualCheckOut
                          ? formatDate(
                              log.actualCheckOut.toDate(),
                              'h:mm a'
                            )
                          : '--'}
                      </TableCell>
                      <TableCell>
                        <AttendanceStatusBadge status={log.status} />
                      </TableCell>
                      <TableCell>
                        {log.lateMinutes > 0 ? (
                          <span className="text-yellow-600 font-medium">
                            {log.lateMinutes} min
                          </span>
                        ) : (
                          '--'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Override
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleOverride(log.id, 'on_time')
                                }
                              >
                                Mark as On Time
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleOverride(log.id, 'completed')
                                }
                              >
                                Mark as Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleOverride(log.id, 'late')
                                }
                              >
                                Mark as Late
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleOverride(log.id, 'no_show')
                                }
                              >
                                Mark as No Show
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
