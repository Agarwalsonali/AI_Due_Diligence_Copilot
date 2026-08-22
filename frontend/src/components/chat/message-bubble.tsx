"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { SourceCitation } from "@/types";
import { User, Bot } from "lucide-react";
import { SourceCard } from "./source-card";

interface MessageBubbleProps {
  message: {
    id: number;
    role: "user" | "assistant";
    content: string;
    sources: SourceCitation[] | null;
    created_at: string;
  };
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3 px-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="shrink-0 h-8 w-8 rounded-full bg-blue-600/20 flex items-center justify-center mt-1">
          <Bot className="h-4 w-4 text-blue-400" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-xl px-4 py-3",
          isUser
            ? "bg-blue-600 text-white"
            : "bg-slate-800 text-slate-200 border border-slate-700"
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
                h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-slate-700 px-1.5 py-0.5 rounded text-xs">{children}</code>
                  ) : (
                    <code className={className}>{children}</code>
                  );
                },
                strong: ({ children }) => <strong className="text-slate-100 font-semibold">{children}</strong>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Streaming indicator */}
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1" />
        )}

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 mb-2 font-medium">Sources</p>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, idx) => (
                <SourceCard key={idx} source={source} index={idx + 1} />
              ))}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="shrink-0 h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center mt-1">
          <User className="h-4 w-4 text-slate-300" />
        </div>
      )}
    </div>
  );
}
