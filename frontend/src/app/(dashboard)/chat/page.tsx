"use client";

import { ChatInterface } from "@/components/chat/chat-interface";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">AI Research Chat</h1>
        <p className="text-slate-400 mt-1">Ask questions grounded in your uploaded documents</p>
      </div>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[calc(100vh-220px)]">
            <ChatInterface />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
