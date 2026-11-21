'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RiskItem, SourceCitation } from '@/types';

export function RiskCard({ risk }: { risk: RiskItem }) {
  const [expanded, setExpanded] = useState(false);

  const severityConfig: Record<string, { color: string; border: string; bg: string }> = {
    CRITICAL: { color: 'text-destructive', border: 'border-l-destructive', bg: 'bg-destructive/5' },
    HIGH: { color: 'text-warning', border: 'border-l-warning', bg: 'bg-warning/5' },
    MEDIUM: { color: 'text-info', border: 'border-l-info', bg: 'bg-info/5' },
    LOW: { color: 'text-success', border: 'border-l-success', bg: 'bg-success/5' },
  };

  const severity = severityConfig[risk.severity] || severityConfig.MEDIUM;

  return (
    <Card className={cn('overflow-hidden border-l-4 transition-[transform,border-color] duration-200 ease-standard hover:-translate-y-0.5', severity.border, severity.bg)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">{risk.category}</Badge>
          <span className={cn('text-xs font-semibold tracking-wider', severity.color)}>{risk.severity}</span>
        </div>
        <CardTitle className="text-base font-semibold flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 mt-0.5 opacity-70 shrink-0" />
          {risk.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">{risk.description}</p>

        {risk.evidence && (
          <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs"
            onClick={() => setExpanded(!expanded)}>
            Evidence & Sources
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        )}

        {expanded && (
          <div className="space-y-3 text-sm bg-muted/30 p-3 rounded-lg">
            <div>
              <span className="font-semibold text-xs">Evidence:</span>
              <p className="text-muted-foreground mt-1">{risk.evidence}</p>
            </div>
            {risk.sources && risk.sources.length > 0 && (
              <div>
                <span className="font-semibold text-xs">Sources:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {risk.sources.map((src: SourceCitation, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {src.documentTitle || `Doc ${src.documentId}`} p.{src.pageNumber}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
