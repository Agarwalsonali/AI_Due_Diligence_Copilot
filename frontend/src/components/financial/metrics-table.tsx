"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FinancialMetric } from "@/types";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MetricsTableProps {
  metrics: FinancialMetric[];
}

export function MetricsTable({ metrics }: MetricsTableProps) {
  const [sortField, setSortField] = useState<keyof FinancialMetric | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof FinancialMetric) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedMetrics = [...metrics].sort((a, b) => {
    if (!sortField) return 0;
    
    const aVal = a[sortField];
    const bVal = b[sortField];
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const getSourceBadgeVariant = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('reported')) return 'default'; // Greenish via css or default primary
    if (s.includes('calculated')) return 'secondary'; // Blueish
    if (s.includes('estimated')) return 'outline'; // Yellowish/Orange
    return 'outline';
  };
  
  const getSourceBadgeClass = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('reported')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20';
    if (s.includes('calculated')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20';
    if (s.includes('estimated')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20';
    return '';
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '%') return `${value.toFixed(2)}%`;
    if (unit === 'currency' || unit === '$') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(value);
    }
    if (unit === 'multiple' || unit === 'x') return `${value.toFixed(2)}x`;
    return value.toLocaleString();
  };

  return (
    <div className="rounded-md border border-border/50 bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('name')} className="h-8 flex items-center px-2 font-semibold">
                Metric <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('period')} className="h-8 flex items-center px-2 font-semibold">
                Period <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" onClick={() => handleSort('value')} className="h-8 flex items-center justify-end px-2 w-full font-semibold">
                Value <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedMetrics.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                No metrics available
              </TableCell>
            </TableRow>
          ) : (
            sortedMetrics.map((metric, idx) => (
              <TableRow key={idx} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium px-4 py-3">{metric.name}</TableCell>
                <TableCell className="text-muted-foreground px-4 py-3">{metric.period}</TableCell>
                <TableCell className="text-right font-mono px-4 py-3">
                  {formatValue(metric.value, metric.unit)}
                </TableCell>
                <TableCell className="text-right px-4 py-3">
                  <Badge 
                    variant={getSourceBadgeVariant(metric.source) as any} 
                    className={`font-normal ${getSourceBadgeClass(metric.source)}`}
                  >
                    {metric.source}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
