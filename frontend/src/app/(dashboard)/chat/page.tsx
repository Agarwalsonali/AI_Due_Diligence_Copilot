'use client';

import { ChatInterface } from '@/components/chat/chat-interface';
import { Card, CardContent } from '@/components/ui/card';

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Research Chat</h1>
        <p className="text-muted-foreground mt-1">Ask questions grounded in your uploaded documents</p>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[calc(100vh-220px)]">
            <ChatInterface />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
