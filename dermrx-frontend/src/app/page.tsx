"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/sidebar";
import AnalyzePanel from "@/components/analyze-panel";
import DrugCheckPanel from "@/components/drug-check-panel";
import ChatPanel from "@/components/chat-panel";
import NewPatientDialog from "@/components/new-patient-dialog";
import { Patient, PatientSession, AnalyzeResponse } from "@/lib/type";
import {
  getPatients, getSessions, savePatient, saveSession,
  deletePatient as deletePatientStorage, deleteSession as deleteSessionStorage,
  generateSessionId,
} from "@/lib/storage";
import { Stethoscope, Pill, Pencil } from "lucide-react";

export default function Home() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"analyze" | "drug_check">("analyze");
  const [dialogPatient, setDialogPatient] = useState<Patient | null>(null);
  const [dialogEditOnly, setDialogEditOnly] = useState(false);

  useEffect(() => {
    setPatients(getPatients());
    setSessions(getSessions());
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const activePatient = activeSession ? patients.find((p) => p.id === activeSession.patientId) || null : null;
  const currentResult = activeSession?.result as AnalyzeResponse | null;

  // New patient (opens dialog)
  const handleNewSession = useCallback((mode: "analyze" | "drug_check") => {
    setDialogMode(mode);
    setDialogPatient(null);
    setDialogEditOnly(false);
    setDialogOpen(true);
  }, []);

  // New session for existing patient (no dialog)
  const handleNewSessionForPatient = useCallback((patientId: string, mode: "analyze" | "drug_check") => {
    const newSession: PatientSession = {
      id: generateSessionId(), patientId, mode,
      name: mode === "analyze" ? "New Analysis" : "New Drug Check",
      createdAt: new Date().toISOString(), result: null, imagePreview: null,
    };
    saveSession(newSession);
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, []);

  // Edit patient (opens dialog with existing patient, no new session)
  const handleEditPatient = useCallback((patient: Patient) => {
    setDialogMode("analyze");
    setDialogPatient(patient);
    setDialogEditOnly(true);
    setDialogOpen(true);
  }, []);

  // Dialog submit → save patient + optionally create session
  const handleDialogSubmit = useCallback((patient: Patient, mode: "analyze" | "drug_check") => {
    savePatient(patient);
    setPatients((prev) => {
      const idx = prev.findIndex((p) => p.id === patient.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = patient; return next; }
      return [patient, ...prev];
    });
    if (!dialogEditOnly) {
      const newSession: PatientSession = {
        id: generateSessionId(), patientId: patient.id, mode,
        name: mode === "analyze" ? "New Analysis" : "New Drug Check",
        createdAt: new Date().toISOString(), result: null, imagePreview: null,
      };
      saveSession(newSession);
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
    }
    setDialogOpen(false);
    setDialogEditOnly(false);
  }, [dialogEditOnly]);

  const handleDeleteSession = useCallback((id: string) => {
    deleteSessionStorage(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) setActiveSessionId(null);
  }, [activeSessionId]);

  const handleDeletePatient = useCallback((id: string) => {
    const ids = sessions.filter((s) => s.patientId === id).map((s) => s.id);
    deletePatientStorage(id);
    setPatients((prev) => prev.filter((p) => p.id !== id));
    setSessions((prev) => prev.filter((s) => s.patientId !== id));
    if (activeSessionId && ids.includes(activeSessionId)) setActiveSessionId(null);
  }, [sessions, activeSessionId]);

  const handleSessionUpdate = useCallback((updated: PatientSession) => {
    saveSession(updated);
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground">
      <Sidebar
        patients={patients} sessions={sessions} activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId} onNewSession={handleNewSession}
        onNewSessionForPatient={handleNewSessionForPatient}
        onDeleteSession={handleDeleteSession} onDeletePatient={handleDeletePatient}
        collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {activeSession && activePatient ? (
          <>
            <div className="h-14 border-b flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-3">
                {activeSession.mode === "analyze"
                  ? <Stethoscope className="h-4 w-4 text-indigo-500" />
                  : <Pill className="h-4 w-4 text-emerald-500" />}
                <div>
                  <h2 className="text-sm font-semibold truncate">{activePatient.name}</h2>
                  <p className="text-[10px] text-muted-foreground">
                    {activeSession.name} · {activePatient.medications.length > 0 ? activePatient.medications.join(", ") : "No medications"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEditPatient(activePatient)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                  title="Edit patient details & medications"
                >
                  <Pencil className="h-3 w-3" />
                  Edit Patient
                </button>
                <span className="text-xs text-muted-foreground">{new Date(activeSession.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {activeSession.mode === "analyze" ? (
              <AnalyzePanel key={activeSession.id} session={activeSession} patient={activePatient} onSessionUpdate={handleSessionUpdate} />
            ) : (
              <DrugCheckPanel key={activeSession.id} session={activeSession} patient={activePatient} onSessionUpdate={handleSessionUpdate} />
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg">
              <Stethoscope className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">DermRx Agent</h1>
            <p className="text-muted-foreground max-w-md mb-8">AI-powered dermatology diagnosis and treatment recommendation with agentic drug safety evaluation.</p>
            <div className="flex gap-4">
              <button onClick={() => handleNewSession("analyze")}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all w-52">
                <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Stethoscope className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div><p className="font-semibold text-sm">Analyze Image</p><p className="text-xs text-muted-foreground">Upload skin image for diagnosis</p></div>
              </button>
              <button onClick={() => handleNewSession("drug_check")}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all w-52">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Pill className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div><p className="font-semibold text-sm">Drug Check</p><p className="text-xs text-muted-foreground">Check drug-drug interactions</p></div>
              </button>
            </div>
          </div>
        )}
      </div>

      <ChatPanel collapsed={chatCollapsed} onToggleCollapse={() => setChatCollapsed(!chatCollapsed)} currentResult={currentResult} />
      <NewPatientDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setDialogEditOnly(false); }} onSubmit={handleDialogSubmit} initialMode={dialogMode} existingPatient={dialogPatient} editOnly={dialogEditOnly} />
    </div>
  );
}