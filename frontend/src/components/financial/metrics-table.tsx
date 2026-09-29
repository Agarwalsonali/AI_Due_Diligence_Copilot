'use client';

import React, { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FinancialMetricResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface MetricsTableProps {
  metrics: FinancialMetricResponse[];
}

export function MetricsTable({ metrics }: MetricsTableProps) {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedMetrics = [...metrics].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = (a as any)[sortField];
    const bVal = (b as any)[sortField];
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const getSourceBadgeClass = (status: string) => {
    switch (status) {
      case 'extracted': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'calculated': return 'bg-primary/10 text-primary border-primary/20';
      case 'not_found': return 'bg-muted text-muted-foreground border-border';
      default: return '';
    }
  };

  const formatValue = (value: number | null, metricName: string) => {
    if (value == null) return 'N/A';
    if (metricName.includes('margin') || metricName.includes('ratio') || metricName.includes('growth')) {
      return `${(value * 100).toFixed(1)}%`;
    }
    return formatCurrency(value);
  };

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('metricName')} className="h-8 flex items-center px-2 font-semibold">
                Metric <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('fiscalYear')} className="h-8 flex items-center px-2 font-semibold">
                Year <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" onClick={() => handleSort('metricValue')} className="h-8 flex items-center justify-end px-2 w-full font-semibold">
                Value <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">Status</TableHead>
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
            sortedMetrics.map((metric) => (
              <TableRow key={metric.id}>
                <TableCell className="font-medium capitalize px-4 py-3">
                  {metric.metricName.replace(/_/g, ' ')}
                </TableCell>
                <TableCell className="text-muted-foreground px-4 py-3">{metric.fiscalYear || '—'}</TableCell>
                <TableCell className="text-right font-mono px-4 py-3">
                  {formatValue(metric.metricValue, metric.metricName)}
                </TableCell>
                <TableCell className="text-right px-4 py-3">
                  <Badge variant="outline" className={`text-xs font-normal ${getSourceBadgeClass(metric.status)}`}>
                    {metric.status}
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
