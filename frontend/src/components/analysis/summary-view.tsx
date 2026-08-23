'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { SummaryResponse } from '@/types';
import { FileText, TrendingUp, ShieldAlert, Activity, Target, Briefcase, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryViewProps {
  summary: SummaryResponse | null;
  isLoading?: boolean;
}

export function SummaryView({ summary, isLoading }: SummaryViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
          </div>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No summary available. Run executive summary analysis first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {summary.executiveSummary && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Executive Summary</h2>
          </div>
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <ReactMarkdown>{summary.executiveSummary}</ReactMarkdown>
          </div>
        </section>
      )}

      {summary.keyFindings && summary.keyFindings.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Key Findings</h2>
          </div>
          <ul className="space-y-2">
            {summary.keyFindings.map((finding: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5">•</span>
                {finding}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
