'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VendorFrequencyDataPoint {
  name: string;
  bookings: number;
}

interface VendorFrequencyChartProps {
  data: VendorFrequencyDataPoint[];
  title?: string;
}

export function VendorFrequencyChart({
  data,
  title = 'Top Vendors by Bookings',
}: VendorFrequencyChartProps) {
  const top10 = [...data]
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {top10.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-sm text-gray-500">
            No vendor booking data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(300, top10.length * 40)}>
            <BarChart
              data={top10}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
                width={90}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  fontSize: '13px',
                }}
                formatter={(value) => [value, 'Bookings']}
              />
              <Bar
                dataKey="bookings"
                fill="#6366f1"
                radius={[0, 6, 6, 0]}
                maxBarSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
