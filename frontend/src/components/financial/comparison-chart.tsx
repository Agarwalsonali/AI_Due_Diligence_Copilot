'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ComparisonChartProps {
  companies: string[];
  metrics: Record<string, Record<string, number>>;
  title?: string;
}

export function ComparisonChart({ companies, metrics, title = 'Company Comparison' }: ComparisonChartProps) {
  const data = Object.entries(metrics).map(([metricName, companyValues]) => ({
    metric: metricName,
    ...companyValues,
  }));

  const colors = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  const formatYAxis = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return `${value}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 10, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="metric" className="text-xs" />
              <YAxis tickFormatter={formatYAxis} className="text-xs" />
              <Tooltip formatter={(v: number) => formatYAxis(v)} />
              <Legend />
              {companies.map((company, idx) => (
                <Bar
                  key={company}
                  dataKey={company}
                  name={company}
                  fill={colors[idx % colors.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
