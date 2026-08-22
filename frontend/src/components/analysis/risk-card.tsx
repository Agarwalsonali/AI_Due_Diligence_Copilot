"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { RiskItem } from "@/types";

export function RiskCard({ risk }: { risk: RiskItem }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const categoryColors: Record<string, string> = {
    Financial: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    Operational: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    Market: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    Regulatory: "bg-red-500/10 text-red-500 border-red-500/20",
    Geopolitical: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  };

  const severityConfig: Record<string, { color: string; border: string; dot: string }> = {
    CRITICAL: {
      color: "text-red-500",
      border: "border-l-red-500",
      dot: "bg-red-500 animate-pulse",
    },
    HIGH: {
      color: "text-orange-500",
      border: "border-l-orange-500",
      dot: "bg-orange-500",
    },
    MEDIUM: {
      color: "text-yellow-500",
      border: "border-l-yellow-500",
      dot: "bg-yellow-500",
    },
    LOW: {
      color: "text-green-500",
      border: "border-l-green-500",
      dot: "bg-green-500",
    },
  };

  const severityInfo = severityConfig[risk.severity] || severityConfig["MEDIUM"];
  const categoryColor = categoryColors[risk.category] || categoryColors["Financial"];

  return (
    <Card className={cn("overflow-hidden border-l-4 transition-all hover:shadow-md", severityInfo.border)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className={cn("font-semibold", categoryColor)}>
            {risk.category}
          </Badge>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-bold tracking-wider", severityInfo.color)}>
              {risk.severity}
            </span>
            <div className={cn("w-2 h-2 rounded-full", severityInfo.dot)} />
          </div>
        </div>
        <CardTitle className="text-lg font-bold flex items-start gap-2">
          <ShieldAlert className="w-5 h-5 mt-0.5 opacity-80" />
          {risk.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {risk.description}
        </p>

        {(risk.evidence || (risk.sources && risk.sources.length > 0)) && (
          <div className="border-t pt-4 mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full flex justify-between items-center h-8 text-xs font-medium"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              View Evidence & Sources
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {isExpanded && (
              <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                {risk.evidence && (
                  <div>
                    <span className="font-semibold text-foreground block mb-1">Evidence:</span>
                    <p>{risk.evidence}</p>
                  </div>
                )}
                {risk.sources && risk.sources.length > 0 && (
                  <div>
                    <span className="font-semibold text-foreground block mb-1">Sources:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {risk.sources.map((source, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
