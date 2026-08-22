"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ExecutiveSummary } from "@/types";
import { FileText, TrendingUp, ShieldAlert, Activity, Target, Briefcase, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export function SummaryView({ summary, isLoading }: { summary: ExecutiveSummary | null, isLoading?: boolean }) {
  if (isLoading || !summary) {
    return (
      <div className="space-y-8 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[95%]" />
          </div>
        ))}
      </div>
    );
  }

  const sections = [
    { id: "overview", title: "Overview", icon: FileText, content: summary.overview },
    { id: "financialHealth", title: "Financial Health", icon: Activity, content: summary.financialHealth },
    { id: "keyStrengths", title: "Key Strengths", icon: Target, content: summary.keyStrengths },
    { id: "keyRisks", title: "Key Risks", icon: ShieldAlert, content: summary.keyRisks },
    { id: "growthOpportunities", title: "Growth Opportunities", icon: TrendingUp, content: summary.growthOpportunities },
    { id: "managementOutlook", title: "Management Outlook", icon: Briefcase, content: summary.managementOutlook },
    { id: "overallAssessment", title: "Overall Assessment", icon: Eye, content: summary.overallAssessment },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Table of Contents - Sidebar on Desktop */}
      <aside className="md:w-64 shrink-0 hidden md:block print:hidden sticky top-6 self-start">
        <Card className="p-4 bg-muted/30 border-none">
          <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Contents</h4>
          <nav className="space-y-2">
            {sections.map(section => (
              <a 
                key={section.id} 
                href={`#${section.id}`}
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </Card>
      </aside>

      {/* Main Content */}
      <div className="flex-1 space-y-12">
        {sections.map((section, index) => (
          <section key={section.id} id={section.id} className={cn("scroll-m-20", index !== 0 && "pt-6 border-t")}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-md text-primary">
                <section.icon className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{section.title}</h2>
            </div>
            
            <div className="prose prose-invert prose-sm sm:prose-base max-w-none text-muted-foreground">
              <ReactMarkdown>{section.content}</ReactMarkdown>
            </div>

            {/* If there are specific sources per section, we'd map them here. Assuming sources are part of markdown or global */}
            {summary.sources && index === sections.length - 1 && (
              <div className="mt-8 p-4 bg-muted/20 rounded-lg border border-border/50">
                <h4 className="text-sm font-semibold mb-3">Sources Cited</h4>
                <div className="flex flex-wrap gap-2">
                  {summary.sources.map((source, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-normal">
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
