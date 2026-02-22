'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UtilizationDataPoint {
  name: string;
  utilization: number;
  color: string;
}

interface UtilizationChartProps {
  data: UtilizationDataPoint[];
  title?: string;
}

export function UtilizationChart({
  data,
  title = 'Resource Utilization',
}: UtilizationChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-sm text-gray-500">
            No utilization data available.
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
                domain={[0, 100]}
                tickFormatter={(value: number) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  fontSize: '13px',
                }}
                formatter={(value) => [`${value}%`, 'Utilization']}
              />
              <Bar dataKey="utilization" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
