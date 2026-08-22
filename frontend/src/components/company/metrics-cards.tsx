'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Activity, CreditCard, Percent, Banknote } from 'lucide-react';
import { FinancialMetric, FinancialRatios } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricsCardsProps {
  metrics?: FinancialMetric[];
  ratios?: FinancialRatios;
  loading?: boolean;
}

export function MetricsCards({ metrics = [], ratios, loading }: MetricsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px] bg-slate-800" />
              <Skeleton className="h-4 w-4 bg-slate-800 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px] bg-slate-800 mb-2" />
              <Skeleton className="h-3 w-[80px] bg-slate-800" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Use latest metrics if available
  const latest = metrics[0] || {};
  const prev = metrics[1] || {};

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined) return 'N/A';
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  const calculateTrend = (current: number, previous: number) => {
    if (!current || !previous) return null;
    const diff = current - previous;
    const percent = (diff / previous) * 100;
    return {
      value: percent,
      positive: diff >= 0
    };
  };

  const cards = [
    {
      title: 'Revenue',
      value: formatCurrency(latest.revenue),
      icon: DollarSign,
      trend: calculateTrend(latest.revenue, prev.revenue)
    },
    {
      title: 'Net Income',
      value: formatCurrency(latest.netIncome),
      icon: Activity,
      trend: calculateTrend(latest.netIncome, prev.netIncome)
    },
    {
      title: 'Profit Margin',
      value: ratios?.netProfitMargin ? `${(ratios.netProfitMargin * 100).toFixed(1)}%` : 'N/A',
      icon: Percent,
      trend: null
    },
    {
      title: 'Cash & Equivalents',
      value: formatCurrency(latest.cash),
      icon: Banknote,
      trend: calculateTrend(latest.cash, prev.cash)
    },
    {
      title: 'Total Debt',
      value: formatCurrency(latest.debt),
      icon: CreditCard,
      trend: calculateTrend(latest.debt, prev.debt),
      invertTrend: true // Higher debt is bad
    },
    {
      title: 'EBITDA',
      value: formatCurrency(latest.ebitda),
      icon: TrendingUp,
      trend: calculateTrend(latest.ebitda, prev.ebitda)
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <Card key={i} className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{card.value}</div>
            {card.trend && (
              <div className="flex items-center mt-1 text-xs">
                {card.trend.positive ? (
                  <TrendingUp className={`w-3 h-3 mr-1 ${card.invertTrend ? 'text-red-500' : 'text-emerald-500'}`} />
                ) : (
                  <TrendingDown className={`w-3 h-3 mr-1 ${card.invertTrend ? 'text-emerald-500' : 'text-red-500'}`} />
                )}
                <span className={
                  (card.trend.positive && !card.invertTrend) || (!card.trend.positive && card.invertTrend)
                    ? 'text-emerald-500'
                    : 'text-red-500'
                }>
                  {Math.abs(card.trend.value).toFixed(1)}% vs previous
                </span>
              </div>
            )}
            {!card.trend && <div className="text-xs text-slate-500 mt-1">Latest period</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
