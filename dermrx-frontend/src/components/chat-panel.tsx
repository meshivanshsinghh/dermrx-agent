"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Send,
  Bot,
  ChevronLeft,
  ChevronRight,
  User,
  Sparkles,
} from "lucide-react";
import { AnalyzeResponse, CandidateEvaluation, SafetyFlag } from "@/lib/type";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentResult: AnalyzeResponse | null;
}

const SUGGESTIONS = [
  "Explain this diagnosis",
  "Why was this drug selected?",
  "Alternative treatments?",
  "Patient risk factors?",
];

export default function ChatPanel({
  collapsed,
  onToggleCollapse,
  currentResult,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset messages when result changes
  useEffect(() => {
    setMessages([]);
  }, [currentResult?.classification?.predicted_category]);

  const generateAnswer = (question: string): string => {
    if (!currentResult) {
      return "No analysis result available yet. Please run an image analysis or drug check first, and I can answer questions about the results.";
    }

    const q = question.toLowerCase();

    // Explain this diagnosis
    if (
      q.includes("explain") &&
      (q.includes("diagnosis") || q.includes("condition") || q.includes("this"))
    ) {
      const cls = currentResult.classification;
      if (!cls) return "No classification data available.";

      let response = `**${cls.display_name}**\n\n`;
      response += currentResult.report?.clinical_summary || "";
      response += `\n\n**Confidence:** ${(cls.confidence * 100).toFixed(1)}% (${cls.confidence_level})`;
      response += `\n**Classification Tier:** Tier ${cls.tier}`;
      if (cls.treatment_class) {
        response += `\n**Treatment Class:** ${cls.treatment_class}`;
      }
      if (cls.safety_flags && cls.safety_flags.length > 0) {
        response += `\n\n⚠️ **Safety Flags:** ${cls.safety_flags.map((f: SafetyFlag) => f.display_name).join(", ")}`;
      }
      return response;
    }

    // Why was this drug selected?
    if (
      q.includes("why") &&
      (q.includes("selected") || q.includes("chosen") || q.includes("drug"))
    ) {
      if (!currentResult.report?.reasoning_trace) {
        return "No drug selection reasoning available for this analysis.";
      }

      let response = `**Selected Drug: ${currentResult.selected_drug || currentResult.report.drug_name}**\n\n`;
      response += `**Reasoning:**\n${currentResult.report.reasoning_trace}`;

      if (
        currentResult.report.rejected_drugs &&
        currentResult.report.rejected_drugs.length > 0
      ) {
        const rejectedNames = currentResult.report.rejected_drugs.map(
          (item: string | { drug: string; reason: string }) =>
            typeof item === "string" ? item : item.drug,
        );
        response += `\n\n**Drugs that were avoided:** ${rejectedNames.join(", ")}`;
        currentResult.report.rejected_drugs.forEach(
          (item: string | { drug: string; reason: string }) => {
            const drugName = typeof item === "string" ? item : item.drug;
            const candidate = currentResult.candidates_evaluated.find(
              (c) => c.drug_name === drugName,
            );
            if (candidate) {
              response += `\n- **${drugName}**: ${candidate.reason}`;
            } else if (typeof item !== "string" && item.reason) {
              response += `\n- **${drugName}**: ${item.reason}`;
            }
          },
        );
      }
      return response;
    }

    // Alternative treatments
    if (
      q.includes("alternative") ||
      q.includes("other") ||
      (q.includes("treatment") && !q.includes("why"))
    ) {
      const safeCandidates = currentResult.candidates_evaluated.filter(
        (c: CandidateEvaluation) =>
          c.status === "SAFE" && c.drug_name !== currentResult.selected_drug,
      );
      const cautionCandidates = currentResult.candidates_evaluated.filter(
        (c: CandidateEvaluation) => c.status === "CAUTION",
      );

      if (safeCandidates.length === 0 && cautionCandidates.length === 0) {
        return `No alternative candidates were found. **${currentResult.selected_drug || currentResult.report?.drug_name}** was the only viable option after safety evaluation.`;
      }

      let response = "**Alternative treatment options:**\n\n";

      if (safeCandidates.length > 0) {
        response += "✅ **Safe alternatives:**\n";
        safeCandidates.forEach((c: CandidateEvaluation) => {
          response += `- **${c.drug_name}** — ${c.reason}\n`;
        });
      }

      if (cautionCandidates.length > 0) {
        response += "\n⚠️ **With caution:**\n";
        cautionCandidates.forEach((c: CandidateEvaluation) => {
          response += `- **${c.drug_name}** — ${c.reason}\n`;
        });
      }

      response += `\n_The system selected **${currentResult.selected_drug || currentResult.report?.drug_name}** as the optimal choice based on the agentic safety evaluation._`;
      return response;
    }

    // Patient risk factors
    if (q.includes("risk") || q.includes("safety") || q.includes("patient")) {
      const rejected = currentResult.candidates_evaluated.filter(
        (c: CandidateEvaluation) => c.status === "REJECTED",
      );

      let response = "**Patient Safety Analysis:**\n\n";

      if (
        currentResult.classification?.safety_flags &&
        currentResult.classification.safety_flags.length > 0
      ) {
        response += `⚠️ **Condition safety flags:** ${currentResult.classification.safety_flags.map((f: SafetyFlag) => f.display_name).join(", ")}\n\n`;
      }

      if (rejected.length > 0) {
        response += "🚫 **Drugs rejected due to safety concerns:**\n";
        rejected.forEach((c: CandidateEvaluation) => {
          response += `\n- **${c.drug_name}** (${c.status}): ${c.reason}`;
          c.findings.forEach((f) => {
            response += `\n  - ${f.severity} ${f.finding_type}: ${f.description}`;
          });
        });
      } else {
        response +=
          "No drugs were rejected. All candidates passed safety evaluation.\n";
      }

      // Check for toxicity findings on selected drug
      const selected = currentResult.candidates_evaluated.find(
        (c: CandidateEvaluation) => c.drug_name === currentResult.selected_drug,
      );
      if (selected && selected.findings.length > 0) {
        response += `\n\n📋 **Notes for selected drug (${selected.drug_name}):**\n`;
        selected.findings.forEach((f) => {
          response += `- ${f.severity} — ${f.description}\n`;
        });
      }

      return response;
    }

    // Generic fallback — try to answer intelligently
    if (currentResult.report) {
      return `Based on the analysis:\n\n${currentResult.report.clinical_summary}\n\n**Recommended:** ${currentResult.report.drug_name}\n\n_Ask me about the diagnosis, drug selection reasoning, alternatives, or patient risk factors for more specific information._`;
    }

    return 'I can help you understand the analysis results. Try asking:\n- "Explain this diagnosis"\n- "Why was this drug selected?"\n- "Alternative treatments?"\n- "Patient risk factors?"';
  };

  const handleSend = (text?: string) => {
    const message = text || input.trim();
    if (!message) return;

    const userMsg: ChatMessage = { role: "user", content: message };
    const answer = generateAnswer(message);
    const assistantMsg: ChatMessage = { role: "assistant", content: answer };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
  };

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
              {currentResult ? "Ask about this case" : "Run analysis first"}
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
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-blue-500 opacity-60" />
            </div>
            <p className="text-sm font-medium">MedGemma Assistant</p>
            <p className="text-xs mt-1 max-w-[200px]">
              {currentResult
                ? "Ask questions about this diagnosis, treatment, or drug safety."
                : "Run an analysis first, then ask questions about the results."}
            </p>
            <div className="mt-6 space-y-2 w-full">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-accent hover:border-blue-200 transition-colors"
                  onClick={() => handleSend(suggestion)}
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
            <div ref={messagesEndRef} />

            {/* Quick follow-ups after messages */}
            {messages.length > 0 && (
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

      {/* Input */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask MedGemma..."
            className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
