"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pill,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";
import { Patient, PatientSession } from "@/lib/type";

interface SidebarProps {
  patients: Patient[];
  sessions: PatientSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: (mode: "analyze" | "drug_check") => void;
  onNewSessionForPatient: (
    patientId: string,
    mode: "analyze" | "drug_check",
  ) => void;
  onDeleteSession: (id: string) => void;
  onDeletePatient: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  patients,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onNewSessionForPatient,
  onDeleteSession,
  onDeletePatient,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(
    new Set(),
  );

  const toggleExpand = (id: string) => {
    setExpandedPatients((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const formatDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.medications.some((m) =>
        m.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  // Auto-expand active patient on activeSessionId change
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const activePatientId = activeSession?.patientId;

  useEffect(() => {
    if (activePatientId) {
      setExpandedPatients((prev) => {
        if (prev.has(activePatientId)) return prev;
        const next = new Set(prev);
        next.add(activePatientId);
        return next;
      });
    }
  }, [activePatientId]);

  if (collapsed) {
    return (
      <div className="w-14 bg-sidebar-background border-r border-sidebar-border flex flex-col items-center py-4 gap-4">
        <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Stethoscope className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onNewSession("analyze")}
          title="New Analysis"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-72 bg-sidebar-background border-r border-sidebar-border flex flex-col h-full">
      {/* Header */}
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
          <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* New buttons */}
      <div className="flex gap-2 p-4">
        <Button
          onClick={() => onNewSession("analyze")}
          size="sm"
          className="flex-1 bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground text-xs"
        >
          <Stethoscope className="h-3 w-3 mr-1" />
          Analyze
        </Button>
        <Button
          onClick={() => onNewSession("drug_check")}
          size="sm"
          variant="outline"
          className="flex-1 text-xs"
        >
          <Pill className="h-3 w-3 mr-1" />
          Drug Check
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/40" />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-sidebar-accent/50 border border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus:outline-none focus:ring-1 focus:ring-sidebar-ring"
          />
        </div>
      </div>

      {/* Patient list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-sidebar-foreground/40">
            <UserPlus className="h-8 w-8 mb-2" />
            <p className="text-xs font-medium">No patients yet</p>
            <p className="text-[10px] mt-1 max-w-[180px] text-center leading-relaxed">
              Click <span className="font-semibold text-sidebar-foreground/70">Analyze</span> or <span className="font-semibold text-sidebar-foreground/70">Drug Check</span> above to add a patient, or pick a demo scenario.
            </p>
            {/* Arrow pointing up */}
            <svg className="mt-3 animate-bounce" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((patient) => {
              const patientSessions = sessions.filter(
                (s) => s.patientId === patient.id,
              );
              const isExpanded = expandedPatients.has(patient.id);
              const hasActive = patientSessions.some(
                (s) => s.id === activeSessionId,
              );

              return (
                <div key={patient.id} className="space-y-0.5">
                  {/* Patient row */}
                  <div
                    onClick={() => toggleExpand(patient.id)}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${hasActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50 text-sidebar-foreground"}`}
                  >
                    <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {patient.name}
                      </p>
                      <p className="text-[10px] opacity-50">
                        {patient.medications.length} meds ·{" "}
                        {patientSessions.length} sessions
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePatient(patient.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </Button>
                  </div>

                  {/* Sessions */}
                  {isExpanded && (
                    <div className="ml-4 pl-3 border-l-2 border-sidebar-border space-y-0.5">
                      {patientSessions.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => onSelectSession(s.id)}
                          className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${activeSessionId === s.id ? "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300" : "hover:bg-sidebar-accent/50 text-sidebar-foreground/70"}`}
                        >
                          <div
                            className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${s.mode === "analyze" ? "bg-indigo-50 dark:bg-indigo-900/20" : "bg-emerald-50 dark:bg-emerald-900/20"}`}
                          >
                            {s.mode === "analyze" ? (
                              <Stethoscope className="h-3 w-3 text-indigo-500" />
                            ) : (
                              <Pill className="h-3 w-3 text-emerald-500" />
                            )}
                          </div>
                          <span className="flex-1 truncate">{s.name}</span>
                          <span className="text-[9px] opacity-40 shrink-0">
                            {formatDate(s.createdAt)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(s.id);
                            }}
                          >
                            <Trash2 className="h-2.5 w-2.5 text-red-400" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-1 pt-1">
                        <button
                          onClick={() =>
                            onNewSessionForPatient(patient.id, "analyze")
                          }
                          className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Analysis
                        </button>
                        <button
                          onClick={() =>
                            onNewSessionForPatient(patient.id, "drug_check")
                          }
                          className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Drug Check
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
