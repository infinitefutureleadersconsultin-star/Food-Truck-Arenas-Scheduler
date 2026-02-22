'use client';

import { useState, useEffect, useCallback } from 'react';
import * as analyticsService from '@/lib/services/analyticsService';
import type { DateRange, UtilizationData, PeakHourData, TrendData, VendorFrequencyData, TableUsageData } from '@/lib/services/analyticsService';

export function useAnalytics(dateRange: DateRange) {
  const [utilization, setUtilization] = useState<UtilizationData[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHourData[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [vendorFrequency, setVendorFrequency] = useState<VendorFrequencyData[]>([]);
  const [tableUsage, setTableUsage] = useState<TableUsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const [util, peak, trend, vendor, table] = await Promise.all([
        analyticsService.getResourceUtilization(dateRange),
        analyticsService.getPeakHours(dateRange),
        analyticsService.getWeeklyTrends(dateRange),
        analyticsService.getVendorFrequency(dateRange),
        analyticsService.getTableUsage(dateRange),
      ]);
      setUtilization(util);
      setPeakHours(peak);
      setTrends(trend);
      setVendorFrequency(vendor);
      setTableUsage(table);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { utilization, peakHours, trends, vendorFrequency, tableUsage, loading, error, refetch: fetchAnalytics };
}
