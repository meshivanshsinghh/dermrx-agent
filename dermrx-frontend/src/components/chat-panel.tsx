"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Send,
  Bot,
  ChevronLeft,
  ChevronRight,
  User,
  Sparkles,
  Loader2,
  RotateCcw,
  Lock,
} from "lucide-react";
import { AnalyzeResponse, DrugCheckResponse } from "@/lib/type";
import { sendChatMessage, clearChatSession } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentResult: AnalyzeResponse | DrugCheckResponse | null;
  sessionId: string | null;
}

const SUGGESTIONS = [
  "Explain this diagnosis",
  "Why was this drug selected?",
  "Alternative treatments?",
  "Patient risk factors?",
  "Drug interactions?",
  "Explain to the patient",
];

export default function ChatPanel({
  collapsed,
  onToggleCollapse,
  currentResult,
  sessionId,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextSent, setContextSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevSessionRef = useRef<string | null>(null);

  const hasResult = !!currentResult;
  const chatSessionId = sessionId ? `chat_${sessionId}` : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset when session changes — also clear old backend session
  useEffect(() => {
    if (prevSessionRef.current !== sessionId) {
      // Clean up old backend session to free GPU memory
      if (prevSessionRef.current) {
        clearChatSession(`chat_${prevSessionRef.current}`).catch(() => {});
      }
      setMessages([]);
      setContextSent(false);
      setError(null);
      setInput("");
      prevSessionRef.current = sessionId;
    }
  }, [sessionId]);

  const handleSend = useCallback(
    async (text?: string) => {
      const message = text || input.trim();
      if (!message || !chatSessionId || !currentResult) return;

      setInput("");
      setError(null);

      // Add user message immediately
      const userMsg: ChatMessage = { role: "user", content: message };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        // Send context only on the very first message of this session
        const context = !contextSent ? currentResult : null;
        const response = await sendChatMessage(chatSessionId, message, context);

        if (!contextSent) setContextSent(true);

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: response.reply,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "Failed to get response";
        setError(errMsg);
        // Remove the user message on error so they can retry
        setMessages((prev) => prev.slice(0, -1));
        setInput(message);
      } finally {
        setIsLoading(false);
      }
    },
    [input, chatSessionId, currentResult, contextSent],
  );

  const handleReset = useCallback(async () => {
    if (chatSessionId) {
      try {
        await clearChatSession(chatSessionId);
      } catch {
        // ignore
      }
    }
    setMessages([]);
    setContextSent(false);
    setError(null);
    setInput("");
  }, [chatSessionId]);

  // ── Collapsed state ──────────────────────────────
  if (collapsed) {
    return (
      <div className="w-14 bg-sidebar-background border-l border-sidebar-border hidden lg:flex flex-col items-center py-4">
        <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="mt-4 relative">
          <Bot className="h-5 w-5 text-muted-foreground" />
          {!hasResult && (
            <Lock className="h-2.5 w-2.5 absolute -bottom-0.5 -right-0.5 text-muted-foreground/60" />
          )}
        </div>
      </div>
    );
  }

  // ── Expanded state ───────────────────────────────
  return (
    <div className="w-full lg:w-80 bg-sidebar-background lg:border-l border-sidebar-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              hasResult
                ? "bg-blue-100 dark:bg-blue-900/30"
                : "bg-muted"
            }`}
          >
            <Bot
              className={`h-4 w-4 ${
                hasResult
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-muted-foreground"
              }`}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold">MedGemma Chat</h3>
            <p className="text-[10px] text-muted-foreground">
              {hasResult ? "Ask about this case" : "Run analysis first"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {hasResult && messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              title="Reset conversation"
              className="h-7 w-7"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {!hasResult ? (
          /* ── Locked state: no analysis yet ── */
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Lock className="h-5 w-5 opacity-40" />
            </div>
            <p className="text-sm font-medium">Chat Unavailable</p>
            <p className="text-xs mt-1 max-w-[200px]">
              Run an image analysis or drug check first. The chat will be unlocked
              once results are available.
            </p>
          </div>
        ) : messages.length === 0 ? (
          /* ── Empty state: ready to chat ── */
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-blue-500 opacity-60" />
            </div>
            <p className="text-sm font-medium">MedGemma Assistant</p>
            <p className="text-xs mt-1 max-w-[200px]">
              Ask questions about this diagnosis, treatment, or drug safety.
            </p>
            <div className="mt-6 space-y-2 w-full">
              {SUGGESTIONS.slice(0, 4).map((suggestion) => (
                <button
                  key={suggestion}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-accent hover:border-blue-200 transition-colors"
                  onClick={() => handleSend(suggestion)}
                  disabled={isLoading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Conversation ── */
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                } animate-slide-in`}
              >
                {msg.role === "assistant" && (
                  <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-muted"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="whitespace-pre-wrap text-xs leading-relaxed">
                      {msg.content
                        .split(/(\*\*.*?\*\*)/)
                        .map((part, j) =>
                          part.startsWith("**") && part.endsWith("**") ? (
                            <strong key={j}>{part.slice(2, -2)}</strong>
                          ) : (
                            <span key={j}>{part}</span>
                          ),
                        )}
                    </div>
                  ) : (
                    <span>{msg.content}</span>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 mt-1">
                    <User className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-2 justify-start animate-slide-in">
                <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                  <span className="text-xs text-muted-foreground">
                    Thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />

            {/* Quick follow-ups */}
            {messages.length > 0 && !isLoading && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[10px] text-muted-foreground font-medium">
                  Follow up:
                </p>
                <div className="flex flex-wrap gap-1">
                  {SUGGESTIONS.filter(
                    (s) =>
                      !messages.some(
                        (m) => m.role === "user" && m.content === s,
                      ),
                  )
                    .slice(0, 3)
                    .map((suggestion) => (
                      <button
                        key={suggestion}
                        className="text-[10px] px-2 py-1 rounded-full border border-border hover:bg-accent transition-colors"
                        onClick={() => handleSend(suggestion)}
                        disabled={isLoading}
                      >
                        {suggestion}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <p className="text-[10px] text-red-600 dark:text-red-400">
            {error}
          </p>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()}
            placeholder={
              hasResult ? "Ask MedGemma..." : "Analysis required..."
            }
            disabled={!hasResult || isLoading}
            className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!input.trim() || !hasResult || isLoading}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
