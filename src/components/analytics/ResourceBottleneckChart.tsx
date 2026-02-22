'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ResourceBottleneckDataPoint {
  name: string;
  demand: number;
  capacity: number;
}

interface ResourceBottleneckChartProps {
  data: ResourceBottleneckDataPoint[];
  title?: string;
}

export function ResourceBottleneckChart({
  data,
  title = 'Resource Demand vs Capacity',
}: ResourceBottleneckChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-sm text-gray-500">
            No bottleneck data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  fontSize: '13px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '13px' }}
                iconType="circle"
              />
              <Bar
                dataKey="demand"
                name="Peak Demand"
                fill="#f97316"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="capacity"
                name="Capacity"
                fill="#22c55e"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
