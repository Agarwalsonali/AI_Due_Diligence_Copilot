"use client";

import React from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface ComparisonChartProps {
  companies: string[];
  metrics: Record<string, Record<string, number>>; // e.g., { "Revenue": { "Company A": 100, "Company B": 120 } }
  title?: string;
}

export function ComparisonChart({ companies, metrics, title = "Company Comparison" }: ComparisonChartProps) {
  // Transform data for Recharts
  // Output: [{ metric: "Revenue", "Company A": 100, "Company B": 120 }, ...]
  const data = Object.entries(metrics).map(([metricName, companyValues]) => {
    return {
      metric: metricName,
      ...companyValues
    };
  });

  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  const chartConfig = companies.reduce((acc, company, idx) => {
    acc[company] = {
      label: company,
      color: colors[idx % colors.length],
    };
    return acc;
  }, {} as Record<string, any>);

  const formatYAxis = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return `${value}`;
  };

  return (
    <Card className="w-full bg-card border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 10, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="metric" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                tickFormatter={formatYAxis} 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip content={<ChartTooltipContent />} cursor={{fill: 'var(--muted)', opacity: 0.2}} />
              <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
              
              {companies.map((company, idx) => (
                <Bar 
                  key={company} 
                  dataKey={company} 
                  name={company} 
                  fill={`var(--color-${company.replace(/\s+/g, '')})`} // standard shadcn config strategy fallback
                  style={{ fill: colors[idx % colors.length] }} 
                  radius={[4, 4, 0, 0]} 
                  animationDuration={1200}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
