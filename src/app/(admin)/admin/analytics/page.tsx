'use client';

import { useState } from 'react';
import { BarChart3, Download, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UtilizationChart } from '@/components/analytics/UtilizationChart';
import { PeakHoursChart } from '@/components/analytics/PeakHoursChart';
import { VendorFrequencyChart } from '@/components/analytics/VendorFrequencyChart';
import { WeekdayHeatmap } from '@/components/analytics/WeekdayHeatmap';
import { ExportReportButton } from '@/components/analytics/ExportReportButton';
import { cn } from '@/lib/utils/cn';

// ---------------------------------------------------------------------------
// Date range helpers
// ---------------------------------------------------------------------------

type RangePreset = '7' | '30' | '90';

const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
];

function getDateRange(preset: RangePreset): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - parseInt(preset));
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const utilizationData = [
  { name: 'Tables', utilization: 78, color: '#22C55E' },
  { name: 'Fridges', utilization: 92, color: '#3B82F6' },
  { name: 'Freezers', utilization: 45, color: '#8B5CF6' },
];

const peakHoursData = [
  { day: 'Mon', hour: 8, value: 5 },
  { day: 'Mon', hour: 9, value: 8 },
  { day: 'Mon', hour: 10, value: 12 },
  { day: 'Mon', hour: 11, value: 15 },
  { day: 'Mon', hour: 12, value: 10 },
  { day: 'Mon', hour: 14, value: 7 },
  { day: 'Tue', hour: 8, value: 4 },
  { day: 'Tue', hour: 9, value: 9 },
  { day: 'Tue', hour: 10, value: 14 },
  { day: 'Tue', hour: 11, value: 11 },
  { day: 'Tue', hour: 12, value: 8 },
  { day: 'Tue', hour: 14, value: 6 },
  { day: 'Wed', hour: 8, value: 6 },
  { day: 'Wed', hour: 9, value: 10 },
  { day: 'Wed', hour: 10, value: 16 },
  { day: 'Wed', hour: 11, value: 18 },
  { day: 'Wed', hour: 12, value: 12 },
  { day: 'Wed', hour: 14, value: 9 },
  { day: 'Thu', hour: 8, value: 3 },
  { day: 'Thu', hour: 9, value: 7 },
  { day: 'Thu', hour: 10, value: 11 },
  { day: 'Thu', hour: 11, value: 13 },
  { day: 'Thu', hour: 12, value: 9 },
  { day: 'Thu', hour: 14, value: 5 },
  { day: 'Fri', hour: 8, value: 7 },
  { day: 'Fri', hour: 9, value: 12 },
  { day: 'Fri', hour: 10, value: 18 },
  { day: 'Fri', hour: 11, value: 20 },
  { day: 'Fri', hour: 12, value: 14 },
  { day: 'Fri', hour: 14, value: 10 },
  { day: 'Sat', hour: 8, value: 2 },
  { day: 'Sat', hour: 9, value: 4 },
  { day: 'Sat', hour: 10, value: 6 },
  { day: 'Sat', hour: 11, value: 8 },
  { day: 'Sat', hour: 12, value: 5 },
  { day: 'Sun', hour: 9, value: 2 },
  { day: 'Sun', hour: 10, value: 3 },
  { day: 'Sun', hour: 11, value: 4 },
];

const vendorFrequencyData = [
  { name: 'Taco Loco', bookings: 24 },
  { name: 'BBQ Boss', bookings: 19 },
  { name: 'Pho Wheels', bookings: 17 },
  { name: 'Pizza Planet', bookings: 15 },
  { name: 'Burger Barn', bookings: 13 },
  { name: 'Sushi Roll', bookings: 11 },
  { name: 'Curry Express', bookings: 9 },
  { name: 'Wok This Way', bookings: 7 },
];

const weekdayHeatmapData = [
  { day: 'Mon', hour: 7, value: 3 },
  { day: 'Mon', hour: 8, value: 6 },
  { day: 'Mon', hour: 9, value: 9 },
  { day: 'Mon', hour: 10, value: 12 },
  { day: 'Mon', hour: 11, value: 14 },
  { day: 'Mon', hour: 12, value: 10 },
  { day: 'Mon', hour: 13, value: 8 },
  { day: 'Mon', hour: 14, value: 7 },
  { day: 'Mon', hour: 15, value: 5 },
  { day: 'Tue', hour: 7, value: 2 },
  { day: 'Tue', hour: 8, value: 5 },
  { day: 'Tue', hour: 9, value: 8 },
  { day: 'Tue', hour: 10, value: 11 },
  { day: 'Tue', hour: 11, value: 13 },
  { day: 'Tue', hour: 12, value: 9 },
  { day: 'Tue', hour: 13, value: 7 },
  { day: 'Tue', hour: 14, value: 6 },
  { day: 'Tue', hour: 15, value: 4 },
  { day: 'Wed', hour: 7, value: 4 },
  { day: 'Wed', hour: 8, value: 7 },
  { day: 'Wed', hour: 9, value: 11 },
  { day: 'Wed', hour: 10, value: 15 },
  { day: 'Wed', hour: 11, value: 18 },
  { day: 'Wed', hour: 12, value: 13 },
  { day: 'Wed', hour: 13, value: 10 },
  { day: 'Wed', hour: 14, value: 8 },
  { day: 'Wed', hour: 15, value: 6 },
  { day: 'Thu', hour: 7, value: 3 },
  { day: 'Thu', hour: 8, value: 5 },
  { day: 'Thu', hour: 9, value: 7 },
  { day: 'Thu', hour: 10, value: 10 },
  { day: 'Thu', hour: 11, value: 12 },
  { day: 'Thu', hour: 12, value: 8 },
  { day: 'Thu', hour: 13, value: 6 },
  { day: 'Thu', hour: 14, value: 5 },
  { day: 'Thu', hour: 15, value: 3 },
  { day: 'Fri', hour: 7, value: 5 },
  { day: 'Fri', hour: 8, value: 9 },
  { day: 'Fri', hour: 9, value: 13 },
  { day: 'Fri', hour: 10, value: 17 },
  { day: 'Fri', hour: 11, value: 20 },
  { day: 'Fri', hour: 12, value: 15 },
  { day: 'Fri', hour: 13, value: 11 },
  { day: 'Fri', hour: 14, value: 9 },
  { day: 'Fri', hour: 15, value: 7 },
  { day: 'Sat', hour: 8, value: 3 },
  { day: 'Sat', hour: 9, value: 5 },
  { day: 'Sat', hour: 10, value: 7 },
  { day: 'Sat', hour: 11, value: 9 },
  { day: 'Sat', hour: 12, value: 6 },
  { day: 'Sat', hour: 13, value: 4 },
  { day: 'Sun', hour: 9, value: 2 },
  { day: 'Sun', hour: 10, value: 3 },
  { day: 'Sun', hour: 11, value: 5 },
  { day: 'Sun', hour: 12, value: 3 },
];

const exportData = [
  { resource: 'Tables', utilization: '78%', period: 'Last 30 Days' },
  { resource: 'Fridges', utilization: '92%', period: 'Last 30 Days' },
  { resource: 'Freezers', utilization: '45%', period: 'Last 30 Days' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const [selectedRange, setSelectedRange] = useState<RangePreset>('30');
  const [dateRange, setDateRange] = useState(getDateRange('30'));

  const handleRangeChange = (preset: RangePreset) => {
    setSelectedRange(preset);
    setDateRange(getDateRange(preset));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Analytics &amp; Reports
            </h1>
            <p className="text-sm text-gray-500">
              {dateRange.startDate} to {dateRange.endDate}
            </p>
          </div>
        </div>
        <ExportReportButton
          data={exportData}
          filename={`analytics-${dateRange.startDate}-${dateRange.endDate}`}
          label="Export Report"
        />
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">
              Date Range:
            </span>
            <div className="flex gap-2">
              {RANGE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={selectedRange === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleRangeChange(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts 2x2 Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UtilizationChart data={utilizationData} title="Resource Utilization" />

        <PeakHoursChart data={peakHoursData} title="Peak Hours" />

        <VendorFrequencyChart
          data={vendorFrequencyData}
          title="Top Vendors by Bookings"
        />

        <WeekdayHeatmap data={weekdayHeatmapData} title="Booking Density" />
      </div>
    </div>
  );
}
