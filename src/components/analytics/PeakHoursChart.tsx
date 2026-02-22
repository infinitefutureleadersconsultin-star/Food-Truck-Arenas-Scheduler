'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

interface PeakHoursDataPoint {
  day: string;
  hour: number;
  value: number;
}

interface PeakHoursChartProps {
  data: PeakHoursDataPoint[];
  title?: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS_START = 6;
const HOURS_END = 22;

function getHourLabel(hour: number): string {
  if (hour === 0) return '12AM';
  if (hour < 12) return `${hour}AM`;
  if (hour === 12) return '12PM';
  return `${hour - 12}PM`;
}

function getColorIntensity(value: number, maxValue: number): string {
  if (maxValue === 0 || value === 0) return 'bg-gray-50';
  const ratio = value / maxValue;
  if (ratio < 0.2) return 'bg-blue-50';
  if (ratio < 0.4) return 'bg-blue-100';
  if (ratio < 0.6) return 'bg-blue-200';
  if (ratio < 0.8) return 'bg-blue-400 text-white';
  return 'bg-blue-600 text-white';
}

export function PeakHoursChart({
  data,
  title = 'Peak Hours',
}: PeakHoursChartProps) {
  const { grid, maxValue, hours } = useMemo(() => {
    const hoursArr: number[] = [];
    for (let h = HOURS_START; h <= HOURS_END; h++) {
      hoursArr.push(h);
    }

    const gridMap: Record<string, Record<number, number>> = {};
    let max = 0;

    DAYS.forEach((day) => {
      gridMap[day] = {};
      hoursArr.forEach((hour) => {
        gridMap[day][hour] = 0;
      });
    });

    data.forEach((point) => {
      if (gridMap[point.day] && point.hour >= HOURS_START && point.hour <= HOURS_END) {
        gridMap[point.day][point.hour] = point.value;
        if (point.value > max) max = point.value;
      }
    });

    return { grid: gridMap, maxValue: max, hours: hoursArr };
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="flex">
              <div className="w-12 flex-shrink-0" />
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="flex-1 text-center text-[10px] text-gray-500 pb-1"
                >
                  {getHourLabel(hour)}
                </div>
              ))}
            </div>

            {/* Grid */}
            {DAYS.map((day) => (
              <div key={day} className="flex items-center">
                <div className="w-12 flex-shrink-0 text-xs font-medium text-gray-600 pr-2">
                  {day}
                </div>
                {hours.map((hour) => {
                  const value = grid[day]?.[hour] ?? 0;
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={cn(
                        'flex-1 aspect-square m-0.5 rounded-sm flex items-center justify-center text-[10px] font-medium transition-colors',
                        getColorIntensity(value, maxValue)
                      )}
                      title={`${day} ${getHourLabel(hour)}: ${value} bookings`}
                    >
                      {value > 0 ? value : ''}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="mt-4 flex items-center justify-end gap-1">
              <span className="text-xs text-gray-500 mr-1">Less</span>
              <div className="h-3 w-3 rounded-sm bg-gray-50 border border-gray-200" />
              <div className="h-3 w-3 rounded-sm bg-blue-50" />
              <div className="h-3 w-3 rounded-sm bg-blue-100" />
              <div className="h-3 w-3 rounded-sm bg-blue-200" />
              <div className="h-3 w-3 rounded-sm bg-blue-400" />
              <div className="h-3 w-3 rounded-sm bg-blue-600" />
              <span className="text-xs text-gray-500 ml-1">More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
