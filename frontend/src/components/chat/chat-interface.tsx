'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';
import { MessageBubble } from './message-bubble';
import { SuggestedQuestions } from './suggested-questions';
import { chatAPI } from '@/lib/api';
import { ChatMessage, SourceCitation, ChatResponse } from '@/types';

interface ChatInterfaceProps {
  companyId?: number | string;
}

export function ChatInterface({ companyId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sessionId, setSessionId] = useState<number | undefined>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text?: string) => {
    const message = text || input.trim();
    if (!message || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      sources: null,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const companyIdNum = typeof companyId === 'string' ? parseInt(companyId) : companyId;

    try {
      const response: ChatResponse = await chatAPI.send({
        message,
        company_id: companyIdNum,
        session_id: sessionId,
      });

      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.answer || 'No answer was generated.',
        sources: response.sources || [],
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      if (response.sessionId) setSessionId(response.sessionId);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || 'An error occurred processing your request.';
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Sorry, ${errorMsg}`,
        sources: null,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-8">
              <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Send className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Ask anything about this company</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Ask questions about financials, risks, opportunities, or any aspect.
                All answers are grounded in the uploaded documents.
              </p>
            </div>
            <SuggestedQuestions onSelect={handleSend} companyId={companyId} />
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t bg-background">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about this company..."
            disabled={loading}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
