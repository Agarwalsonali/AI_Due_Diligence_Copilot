'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronUp, TrendingUp, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OpportunityItem, SourceCitation } from '@/types';

export function OpportunityCard({ opportunity }: { opportunity: OpportunityItem }) {
  const [expanded, setExpanded] = useState(false);

  const confidence = typeof opportunity.confidence === 'string'
    ? parseFloat(opportunity.confidence) || 0
    : opportunity.confidence || 0;

  return (
    <Card className="overflow-hidden border-l-4 border-l-emerald-500/50 transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            {opportunity.category}
          </Badge>
        </div>
        <CardTitle className="text-base font-semibold flex items-start gap-2">
          <TrendingUp className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
          {opportunity.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">{opportunity.description}</p>

        {confidence > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Confidence</span>
              <span className={cn(
                confidence > 70 ? 'text-emerald-500' : confidence > 40 ? 'text-yellow-500' : 'text-orange-500'
              )}>
                {Math.round(confidence)}%
              </span>
            </div>
            <Progress value={confidence} className="h-1.5" />
          </div>
        )}

        {opportunity.evidence && (
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
              <p className="text-muted-foreground mt-1">{opportunity.evidence}</p>
            </div>
            {opportunity.sources && opportunity.sources.length > 0 && (
              <div>
                <span className="font-semibold text-xs">Sources:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {opportunity.sources.map((src: SourceCitation, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-[10px]">
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
