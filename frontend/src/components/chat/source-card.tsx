"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SourceCitation } from "@/types";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";

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
        className="cursor-pointer bg-slate-800/50 border-slate-600 hover:border-blue-500 transition-colors text-xs gap-1"
        onClick={() => setExpanded(!expanded)}
      >
        <FileText className="h-3 w-3 text-blue-400" />
        [{index}] {source.document_title || `Doc ${source.document_id}`}
        {source.page_number && ` p.${source.page_number}`}
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Badge>

      {expanded && (
        <div className="mt-2 p-3 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 max-w-sm">
          <div className="font-medium text-slate-200 mb-1">
            {source.document_title}
            {source.page_number && ` — Page ${source.page_number}`}
          </div>
          {source.section && (
            <div className="text-blue-400 mb-1">{source.section}</div>
          )}
          <p className="leading-relaxed text-slate-400">
            {source.text_excerpt || "No excerpt available"}
          </p>
        </div>
      )}
    </div>
  );
}
