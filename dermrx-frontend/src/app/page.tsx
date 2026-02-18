"use client";
import { useState, useEffect, useCallback } from "react";
import {
  PatientSession,
  getSessions,
  saveSession,
  deleteSession,
  generateSessionId,
} from "@/lib/api";
import Sidebar from "@/components/sidebar";
import { Pill, Stethoscope } from "lucide-react";
import AnalyzePanel from "@/components/analyze-panel";
import ChatPanel from "@/components/chat-panel";
import DrugCheckPanel from "@/components/drug-check-panel";

export default function Home() {
  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  // loading sessions from localstorage on mount
  useEffect(() => {
    const saved = getSessions();
    setSessions(saved);
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  const handleNewSession = useCallback((mode: "analyze" | "drug_check") => {
    const newSession: PatientSession = {
      id: generateSessionId(),
      name: mode === "analyze" ? `New Analysis` : `New Drug Check`,
      createdAt: new Date().toISOString(),
      mode,
      result: null,
      imagePreview: null,
    };
    saveSession(newSession);
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const handleDeleteSession = useCallback(
    (id: string) => {
      deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    },
    [activeSessionId],
  );

  const handleSessionUpdate = useCallback((updated: PatientSession) => {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground">
      {/* Left Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Center Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeSession ? (
          <>
            {/* Workspace Header  */}
            <div className="h-14 border-b flex items-center justify-between px-6">
              <div className="flex items-center gap-2">
                {activeSession.mode === "analyze" ? (
                  <Stethoscope className="h-4 w-4 text-indigo-500" />
                ) : (
                  <Pill className="h-4 w-4 text-emerald-500" />
                )}
                {/* TODO: Name of Analysis or Drug Check should be present here somehow */}
                <h2 className="text-sm font-semibold truncate">
                  {activeSession.name}
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(activeSession.createdAt).toLocaleString()}
              </span>
            </div>
            {/* Panel */}
            {activeSession.mode === "analyze" ? (
              <AnalyzePanel
                key={activeSession.id}
                session={activeSession}
                onSessionUpdate={handleSessionUpdate}
              />
            ) : (
              <DrugCheckPanel
                key={activeSession.id}
                session={activeSession}
                onSessionUpdate={handleSessionUpdate}
              />
            )}
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg">
              <Stethoscope className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">DermRx Agent</h1>
            <p className="text-muted-foreground max-w-md mb-8">
              AI-powered dermatology diagnosis and treatment recommendation
              system with agentic drug safety evaluation.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleNewSession("analyze")}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all w-52"
              >
                <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Stethoscope className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Analyze Image</p>
                  <p className="text-xs text-muted-foreground">
                    Upload skin image for diagnosis
                  </p>
                </div>
              </button>
              <button
                onClick={() => handleNewSession("drug_check")}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all w-52"
              >
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Pill className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Drug Check</p>
                  <p className="text-xs text-muted-foreground">
                    Check drug-drug interactions
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Chat Panel */}
      <ChatPanel
        collapsed={chatCollapsed}
        onToggleCollapse={() => setChatCollapsed(!chatCollapsed)}
      />
    </div>
  );
}
