"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, TrendingUp, AlertTriangle, Lightbulb, BarChart3, Scale } from "lucide-react";

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  companyId?: number | string;
}

const QUESTIONS = [
  {
    icon: TrendingUp,
    text: "What are the company's key revenue drivers?",
    color: "text-emerald-400",
  },
  {
    icon: AlertTriangle,
    text: "What are the biggest risks facing this company?",
    color: "text-red-400",
  },
  {
    icon: Lightbulb,
    text: "What growth opportunities does this company have?",
    color: "text-yellow-400",
  },
  {
    icon: BarChart3,
    text: "Summarize the financial health and recent performance",
    color: "text-blue-400",
  },
  {
    icon: Scale,
    text: "How does the company compare to its competitors?",
    color: "text-purple-400",
  },
  {
    icon: MessageSquare,
    text: "What does management say about the outlook?",
    color: "text-cyan-400",
  },
];

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-xl">
      {QUESTIONS.map((q, idx) => (
        <Button
          key={idx}
          variant="outline"
          size="sm"
          className="bg-slate-800/50 border-slate-700 hover:border-blue-500 hover:bg-slate-800 text-slate-300 text-xs h-auto py-2 px-3 text-left"
          onClick={() => onSelect(q.text)}
        >
          <q.icon className={`h-3.5 w-3.5 mr-2 shrink-0 ${q.color}`} />
          {q.text}
        </Button>
      ))}
    </div>
  );
}
