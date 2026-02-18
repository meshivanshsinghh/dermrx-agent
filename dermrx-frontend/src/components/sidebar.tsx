"use client";
import { useState } from "react";
import { Button } from "./ui/button";
import { PatientSession } from "@/lib/api";
import { ChevronLeft, Pill, Search, Stethoscope, Trash2, User } from "lucide-react";

interface SidebarProps {
  sessions: PatientSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: (mode: "analyze" | "drug_check") => void;
  onDeleteSession: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = sessions.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  if (collapsed) {
    return <div>collapsed</div>;
  }
  return (
    <div className="w-72 bg-sidebar-background border-r border-sidebar-border flex flex-col h-full">
      {/* Header  */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Stethoscope className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-sidebar-foreground">
                DermRx
              </h1>
              <p className="text-[10px] text-sidebar-foreground/50">
                AI Dermatology Agent
              </p>
            </div>
          </div>
          {/* TODO: Add Animation to closing of SideBar */}
          <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* New Session Buttons  */}
      <div className="flex gap-2 p-4">
        <Button
          onClick={() => onNewSession("analyze")}
          size="sm"
          className="flex-1 bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground text-xs"
        >
            {/* TODO: When Clicking the button show popup for entering patient info  */}
          <Stethoscope className="h-3 w-3 mr-1" />
          Analyze
        </Button>
        <Button
          onClick={() => onNewSession("drug_check")}
          size="sm"
          variant="outline"
          className="flex-1 text-xs"
        >
            {/* TODO: When Clicking the button show popup for entering patient info  */}
          <Pill className="h-3 w-3 mr-1" />
          Drug Check
        </Button>
      </div>

      {/* Search  */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/40" />
          <input
            type="text"
            placeholder="Search sessions...."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-sidebar-accent/50 border 
                        border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus:outline-none
                        focus:ring-1 focus:ring-sidebar-ring"
          />
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
        {/* TODO: Fix the loading of session and clearing of it  */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-sidebar-foreground/40">
            <User className="h-8 w-8 mb-2" />
            <p className="text-xs">No sessions yet</p>
            <p className="text-[10px]">Start a new analysis</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((session) => (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  activeSessionId === session.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                    session.mode === "analyze"
                      ? "bg-indigo-100 dark:bg-indigo-900/30"
                      : "bg-emerald-100 dark:bg-emerald-900/30"
                  }`}
                >
                  {session.mode === "analyze" ? (
                    <Stethoscope className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Pill className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{session.name}</p>
                  <p className="text-[10px] opacity-50">
                    {formatDate(session.createdAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-red-400" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
