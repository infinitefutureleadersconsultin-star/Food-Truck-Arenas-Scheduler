import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  QueryConstraint,
} from 'firebase/firestore';
import { getDocuments } from '@/lib/firebase/firestore';
import { useAuthContext } from '@/contexts/AuthContext';
import type { AttendanceLog, AttendanceStatus } from '@/lib/types';

// ---------------------------------------------------------------------------
// Options type
// ---------------------------------------------------------------------------
interface UseAttendanceOptions {
  userId?: string;
  dateRange?: {
    start: string; // "YYYY-MM-DD"
    end: string;   // "YYYY-MM-DD"
  };
}

// ---------------------------------------------------------------------------
// Stats type returned by the hook
// ---------------------------------------------------------------------------
interface AttendanceStats {
  total: number;
  onTime: number;
  late: number;
  earlyLeave: number;
  noShow: number;
  completed: number;
  onTimePercentage: number;
  averageLateMinutes: number;
}

/**
 * useAttendance - Fetch attendance logs with optional filtering.
 *
 * Supports filtering by userId and/or a date range. Also computes
 * summary statistics from the returned logs.
 */
export function useAttendance(options?: UseAttendanceOptions) {
  const { user } = useAuthContext();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const constraints: QueryConstraint[] = [];

      // Filter by user - default to current user if no userId provided
      const targetUserId = options?.userId ?? user?.uid;
      if (targetUserId) {
        constraints.push(where('userId', '==', targetUserId));
      }

      // Filter by date range
      if (options?.dateRange) {
        constraints.push(where('date', '>=', options.dateRange.start));
        constraints.push(where('date', '<=', options.dateRange.end));
      }

      constraints.push(orderBy('date', 'desc'));

      const results = await getDocuments<AttendanceLog>(
        'attendance',
        ...constraints
      );
      setLogs(results);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch attendance logs.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [options?.userId, options?.dateRange?.start, options?.dateRange?.end, user?.uid]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ---- Computed statistics ----
  const stats = useMemo<AttendanceStats>(() => {
    const total = logs.length;
    if (total === 0) {
      return {
        total: 0,
        onTime: 0,
        late: 0,
        earlyLeave: 0,
        noShow: 0,
        completed: 0,
        onTimePercentage: 0,
        averageLateMinutes: 0,
      };
    }

    const countByStatus = (status: AttendanceStatus) =>
      logs.filter((l) => l.status === status).length;

    const onTime = countByStatus('on_time');
    const late = countByStatus('late');
    const earlyLeave = countByStatus('early_leave');
    const noShow = countByStatus('no_show');
    const completed = countByStatus('completed');

    const lateLogs = logs.filter((l) => l.status === 'late');
    const totalLateMinutes = lateLogs.reduce(
      (sum, l) => sum + (l.lateMinutes ?? 0),
      0
    );
    const averageLateMinutes =
      lateLogs.length > 0 ? Math.round(totalLateMinutes / lateLogs.length) : 0;

    const onTimePercentage =
      total > 0 ? Math.round(((onTime + completed) / total) * 100) : 0;

    return {
      total,
      onTime,
      late,
      earlyLeave,
      noShow,
      completed,
      onTimePercentage,
      averageLateMinutes,
    };
  }, [logs]);

  return {
    logs,
    stats,
    loading,
    error,
    refetch: fetchLogs,
  };
}
