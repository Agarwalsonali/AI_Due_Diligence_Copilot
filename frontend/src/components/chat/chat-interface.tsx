"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { MessageBubble } from "./message-bubble";
import { SuggestedQuestions } from "./suggested-questions";
import { streamChat } from "@/lib/api";
import { ChatMessage, SourceCitation } from "@/types";

interface ChatInterfaceProps {
  companyId?: number | string;
}

export function ChatInterface({ companyId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sessionId, setSessionId] = useState<number | undefined>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  const handleSend = async (text?: string) => {
    const message = text || input.trim();
    if (!message || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: message,
      sources: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setStreamingText("");

    const companyIdNum = typeof companyId === "string" ? parseInt(companyId) : companyId;

    streamChat(
      {
        message,
        company_id: companyIdNum,
        session_id: sessionId,
      },
      (chunk: string) => {
        setStreamingText((prev) => prev + chunk);
      },
      (response: any) => {
        const assistantMessage: ChatMessage = {
          id: Date.now() + 1,
          role: "assistant",
          content: response.content || streamingText,
          sources: response.sources || [],
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingText("");
        if (response.session_id) setSessionId(response.session_id);
        setLoading(false);
      },
      (error: Error) => {
        const errorMessage: ChatMessage = {
          id: Date.now() + 1,
          role: "assistant",
          content: "Sorry, I encountered an error processing your request. Please try again.",
          sources: null,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setStreamingText("");
        setLoading(false);
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-slate-500 mb-8">
              <div className="h-16 w-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Send className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-300 mb-2">Ask anything about this company</h3>
              <p className="text-sm max-w-md">
                Ask questions about financials, risks, opportunities, or any aspect of the company.
                All answers are grounded in the uploaded documents.
              </p>
            </div>
            <SuggestedQuestions onSelect={handleSend} companyId={companyId} />
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {loading && streamingText && (
              <MessageBubble
                message={{
                  id: -1,
                  role: "assistant",
                  content: streamingText,
                  sources: null,
                  created_at: new Date().toISOString(),
                }}
                isStreaming
              />
            )}
            {loading && !streamingText && (
              <div className="flex items-center gap-2 text-slate-400 px-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about this company..."
            disabled={loading}
            className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus-visible:ring-blue-500"
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            size="icon"
            className="bg-blue-600 hover:bg-blue-700 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
