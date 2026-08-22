"use client";

import React from "react";
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { ChartDataPoint } from "@/types";

interface RevenueChartProps {
  data: ChartDataPoint[];
  title: string;
  type: "bar" | "line" | "area";
}

export function RevenueChart({ data, title, type }: RevenueChartProps) {
  // Common chart configuration
  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--primary))",
    },
    profit: {
      label: "Profit",
      color: "hsl(var(--chart-2))",
    }
  };

  const formatYAxis = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    return `$${value}`;
  };

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <BarChart data={data} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatYAxis} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
            <Bar dataKey="value" name="Revenue" fill="url(#colorRevenue)" radius={[4, 4, 0, 0]} animationDuration={1000} />
            {data[0]?.secondaryValue !== undefined && (
              <Bar dataKey="secondaryValue" name="Profit" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} animationDuration={1000} />
            )}
          </BarChart>
        );
      case "line":
        return (
          <LineChart data={data} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatYAxis} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
            <Line type="monotone" dataKey="value" name="Revenue" stroke="var(--color-revenue)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} animationDuration={1000} />
            {data[0]?.secondaryValue !== undefined && (
              <Line type="monotone" dataKey="secondaryValue" name="Profit" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={{ r: 4 }} animationDuration={1000} />
            )}
          </LineChart>
        );
      case "area":
        return (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatYAxis} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
            <Area type="monotone" dataKey="value" name="Revenue" stroke="var(--color-revenue)" fillOpacity={1} fill="url(#colorRevenue)" animationDuration={1000} />
          </AreaChart>
        );
    }
  };

  return (
    <Card className="w-full bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
