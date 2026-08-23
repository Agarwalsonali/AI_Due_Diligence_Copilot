'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { SourceCitation } from '@/types';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface SourceCardProps {
  source: SourceCitation;
  index: number;
}

export function SourceCard({ source, index }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="inline-block">
      <Badge
        variant="outline"
        className="cursor-pointer hover:border-primary/50 transition-colors text-xs gap-1"
        onClick={() => setExpanded(!expanded)}
      >
        <FileText className="h-3 w-3 text-primary" />
        [{index}] {source.documentTitle || `Doc ${source.documentId}`}
        {source.pageNumber && ` p.${source.pageNumber}`}
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Badge>

      {expanded && (
        <div className="mt-2 p-3 bg-muted border rounded-lg text-xs max-w-sm">
          <div className="font-medium mb-1">
            {source.documentTitle}
            {source.pageNumber && ` — Page ${source.pageNumber}`}
          </div>
          {source.section && (
            <div className="text-primary mb-1 text-xs">{source.section}</div>
          )}
          <p className="leading-relaxed text-muted-foreground">
            {source.excerpt || 'No excerpt available'}
          </p>
        </div>
      )}
    </div>
  );
}
