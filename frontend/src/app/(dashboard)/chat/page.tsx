'use client';

import { ChatInterface } from '@/components/chat/chat-interface';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Research Chat"
        description="Ask questions grounded in your uploaded documents"
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Height is the viewport minus the shell chrome (header, page heading,
              main padding) so the composer stays above the fold on short screens. */}
          <div className="h-[calc(100dvh-220px)] min-h-[300px]">
            <ChatInterface />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
