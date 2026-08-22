"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronUp, TrendingUp, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { OpportunityItem } from "@/types";

export function OpportunityCard({ opportunity }: { opportunity: OpportunityItem }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="overflow-hidden border-l-4 border-l-emerald-500/50 transition-all hover:shadow-md bg-gradient-to-br from-background to-emerald-950/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" />
            {opportunity.category}
          </Badge>
        </div>
        <CardTitle className="text-lg font-bold flex items-start gap-2">
          <TrendingUp className="w-5 h-5 mt-0.5 text-emerald-500 opacity-80" />
          {opportunity.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {opportunity.description}
        </p>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-medium">
            <span className="text-muted-foreground">Confidence Score</span>
            <span className={cn(
              opportunity.confidenceScore > 80 ? "text-emerald-500" : 
              opportunity.confidenceScore > 50 ? "text-yellow-500" : "text-orange-500"
            )}>
              {opportunity.confidenceScore}%
            </span>
          </div>
          <Progress 
            value={opportunity.confidenceScore} 
            className="h-1.5"
            indicatorColor={
              opportunity.confidenceScore > 80 ? "bg-emerald-500" : 
              opportunity.confidenceScore > 50 ? "bg-yellow-500" : "bg-orange-500"
            }
          />
        </div>

        {(opportunity.evidence || (opportunity.sources && opportunity.sources.length > 0)) && (
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
                {opportunity.evidence && (
                  <div>
                    <span className="font-semibold text-foreground block mb-1">Evidence:</span>
                    <p>{opportunity.evidence}</p>
                  </div>
                )}
                {opportunity.sources && opportunity.sources.length > 0 && (
                  <div>
                    <span className="font-semibold text-foreground block mb-1">Sources:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {opportunity.sources.map((source, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0 border-emerald-500/20">
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
