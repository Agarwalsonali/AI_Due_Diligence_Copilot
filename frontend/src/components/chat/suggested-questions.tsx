'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, AlertTriangle, Lightbulb, BarChart3, Scale, MessageSquare } from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  companyId?: number | string;
}

const QUESTIONS = [
  { icon: TrendingUp, text: "What are the company's key revenue drivers?" },
  { icon: AlertTriangle, text: "What are the biggest risks facing this company?" },
  { icon: Lightbulb, text: "What growth opportunities does this company have?" },
  { icon: BarChart3, text: "Summarize the financial health and recent performance" },
  { icon: Scale, text: "How does the company compare to its competitors?" },
  { icon: MessageSquare, text: "What does management say about the outlook?" },
];

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-xl">
      {QUESTIONS.map((q, idx) => (
        <Button
          key={idx}
          variant="outline"
          size="sm"
          className="h-auto py-2 px-3 text-xs text-left whitespace-normal"
          onClick={() => onSelect(q.text)}
        >
          <q.icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          {q.text}
        </Button>
      ))}
    </div>
  );
}
