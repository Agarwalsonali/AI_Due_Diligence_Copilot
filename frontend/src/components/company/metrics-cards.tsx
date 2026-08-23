'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Activity, CreditCard, Percent, Banknote } from 'lucide-react';
import { FinancialMetricResponse, FinancialRatio } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface MetricsCardsProps {
  metrics?: FinancialMetricResponse[];
  ratios?: FinancialRatio[];
  loading?: boolean;
}

function getMetricByName(metrics: FinancialMetricResponse[], name: string): FinancialMetricResponse | undefined {
  return metrics.find(m => m.metricName === name);
}

export function MetricsCards({ metrics = [], ratios = [], loading }: MetricsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px] mb-2" />
              <Skeleton className="h-3 w-[80px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getLatestMetric = (name: string) => {
    const found = getMetricByName(metrics, name);
    return found?.metricValue ?? null;
  };

  const getRatioByName = (name: string) => {
    const found = Array.isArray(ratios) ? ratios.find((r: any) => r.name === name) : null;
    return found?.value ?? null;
  };

  const cards = [
    {
      title: 'Revenue',
      value: formatCurrency(getLatestMetric('revenue')),
      icon: DollarSign,
      trend: getRatioByName('revenue_growth'),
      trendLabel: 'YoY Growth',
    },
    {
      title: 'Net Income',
      value: formatCurrency(getLatestMetric('net_income')),
      icon: Activity,
      trend: null,
    },
    {
      title: 'Net Margin',
      value: getRatioByName('net_margin') != null ? formatPercentage(getRatioByName('net_margin')) : 'N/A',
      icon: Percent,
      trend: null,
    },
    {
      title: 'Cash & Equivalents',
      value: formatCurrency(getLatestMetric('cash')),
      icon: Banknote,
      trend: null,
    },
    {
      title: 'Total Debt',
      value: formatCurrency(getLatestMetric('debt')),
      icon: CreditCard,
      trend: getRatioByName('debt_to_equity'),
      trendLabel: 'D/E Ratio',
      invert: true,
    },
    {
      title: 'Free Cash Flow',
      value: formatCurrency(getLatestMetric('free_cash_flow')),
      icon: TrendingUp,
      trend: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            {card.trend != null && typeof card.trend === 'number' && (
              <div className="flex items-center mt-1 text-xs">
                {(card.trend > 0) === !card.invert ? (
                  <TrendingUp className="w-3 h-3 mr-1 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
                )}
                <span className={card.trend > 0 ? (card.invert ? 'text-red-500' : 'text-emerald-500') : (card.invert ? 'text-emerald-500' : 'text-red-500')}>
                  {Math.abs(card.trend * 100).toFixed(1)}% {card.trendLabel || 'change'}
                </span>
              </div>
            )}
            {card.trend == null && <div className="text-xs text-muted-foreground mt-1">Latest period</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
