"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Send,
  Bot,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function ChatPanel({
  collapsed,
  onToggleCollapse,
}: ChatPanelProps) {
  const [messages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  if (collapsed) {
    return (
      <div className="w-14 bg-sidebar-background border-l border-sidebar-border flex flex-col items-center py-4">
        <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="mt-4">
          <Bot className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-sidebar-background border-l border-sidebar-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">MedGemma Chat</h3>
            <p className="text-[10px] text-muted-foreground">
              Ask about the case
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageCircle className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">MedGemma Assistant</p>
            <p className="text-xs mt-1 max-w-[200px]">
              Ask questions about the diagnosis, treatment options, or drug
              interactions.
            </p>
            <div className="mt-6 space-y-2 w-full">
              {[
                "Explain this diagnosis",
                "Why was this drug selected?",
                "Alternative treatments?",
                "Patient risk factors?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
                  onClick={() => setInput(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-muted"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask MedGemma..."
            className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button size="icon" disabled className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 text-center">
          Coming soon — MedGemma conversational mode
        </p>
      </div>
    </div>
  );
}