"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/sidebar";
import AnalyzePanel from "@/components/analyze-panel";
import DrugCheckPanel from "@/components/drug-check-panel";
import ChatPanel from "@/components/chat-panel";
import NewPatientDialog from "@/components/new-patient-dialog";
import StartupLoader from "@/components/startup-loader";
import { Patient, PatientSession, AnalyzeResponse, DrugCheckResponse } from "@/lib/type";
import {
  getPatients, getSessions, savePatient, saveSession,
  deletePatient as deletePatientStorage, deleteSession as deleteSessionStorage,
  generateSessionId,
} from "@/lib/storage";
import { Stethoscope, Pill, Pencil, AlertTriangle, FlaskConical, Star, Users, Home as HomeIcon } from "lucide-react";

/* ─────────────────────────────────────────────
   Demo Scenarios
   ───────────────────────────────────────────── */

const DEMO_SCENARIOS = [
  {
    id: "warfarin",
    title: "The Warfarin Patient",
    subtitle: "Flagship Demo",
    description:
      "68-year-old male on blood thinners presents with fungal skin infection. Watch the agent reject fluconazole and select a safe alternative.",
    badge: "★ Recommended",
    badgeColor:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    borderColor:
      "border-indigo-300 dark:border-indigo-700 hover:border-indigo-500",
    bgColor: "hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10",
    accentIcon: Star,
    patient: {
      name: "John Doe",
      age: 68,
      sex: "male" as const,
      medications: ["warfarin", "metformin", "lisinopril"],
      notes:
        "Atrial fibrillation, Type 2 diabetes, hypertension. On anticoagulation therapy.",
    },
    mode: "analyze" as const,
    imagePath: "/demo/tinea.jpg",
    avatarPath: "/demo/avatar-john.svg",
    expectedResult:
      "Rejects fluconazole (warfarin DDI), selects clotrimazole",
    tags: ["Major DDI", "Antifungal", "Anticoagulant"],
    tagColors: [
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    ],
  },
  {
    id: "polypharmacy",
    title: "Polypharmacy Elderly",
    subtitle: "Complex Scenario",
    description:
      "82-year-old female on 7 medications presents with psoriasis. Multi-drug interaction navigation across specialties.",
    badge: "Complex",
    badgeColor:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    borderColor:
      "border-amber-300 dark:border-amber-700 hover:border-amber-500",
    bgColor: "hover:bg-amber-50/30 dark:hover:bg-amber-900/10",
    accentIcon: Users,
    patient: {
      name: "Margaret Chen",
      age: 82,
      sex: "female" as const,
      medications: [
        "metformin",
        "atorvastatin",
        "metoprolol",
        "omeprazole",
        "aspirin",
        "amlodipine",
        "levothyroxine",
      ],
      notes:
        "Type 2 diabetes, hyperlipidemia, hypertension, GERD, hypothyroidism. Polypharmacy patient.",
    },
    mode: "analyze" as const,
    imagePath: "/demo/psoriasis.jpg",
    avatarPath: "/demo/avatar-margaret.svg",
    expectedResult:
      "Navigates interactions across 7 concurrent medications",
    tags: ["Polypharmacy", "7 Medications", "Elderly"],
    tagColors: [
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    ],
  },
  {
    id: "photosensitivity",
    title: "Photosensitivity Risk",
    subtitle: "TxGemma Demo",
    description:
      "24-year-old on doxycycline presents with acne. TxGemma molecular analysis flags photosensitivity risk for tretinoin.",
    badge: "TxGemma",
    badgeColor:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    borderColor:
      "border-purple-300 dark:border-purple-700 hover:border-purple-500",
    bgColor: "hover:bg-purple-50/30 dark:hover:bg-purple-900/10",
    accentIcon: FlaskConical,
    patient: {
      name: "Alex Rivera",
      age: 24,
      sex: "female" as const,
      medications: ["doxycycline"],
      notes: "On doxycycline for bacterial infection. Sun-sensitive skin.",
    },
    mode: "analyze" as const,
    imagePath: "/demo/acne.jpg",
    avatarPath: "/demo/avatar-alex.svg",
    expectedResult:
      "Flags photosensitivity risk, adds sun protection counsel",
    tags: ["Photosensitivity", "TxGemma", "Acne"],
    tagColors: [
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    ],
  },
];

export default function Home() {
  const [appReady, setAppReady] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"analyze" | "drug_check">("analyze");
  const [dialogPatient, setDialogPatient] = useState<Patient | null>(null);
  const [dialogEditOnly, setDialogEditOnly] = useState(false);

  const handleStartupReady = useCallback((mockMode: boolean) => {
    setIsMockMode(mockMode);
    setAppReady(true);
  }, []);

  useEffect(() => {
    setPatients(getPatients());
    setSessions(getSessions());
  }, []);

  /* ── URL-based navigation: parse URL on initial load ── */
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/p\/([^/]+)\/s\/([^/]+)/) || path.match(/^\/patient\/([^/]+)\/session\/([^/]+)/);
    if (match) {
      const [, patientId, sessionId] = match;
      // Verify the session exists in localStorage
      const allSessions = getSessions();
      const found = allSessions.find(
        (s) => s.id === sessionId && s.patientId === patientId
      );
      if (found) {
        setActiveSessionId(sessionId);
      }
    }
  }, []);

  /* ── Sync URL when activeSessionId changes ── */
  useEffect(() => {
    if (activeSessionId) {
      const session = sessions.find((s) => s.id === activeSessionId);
      if (session) {
        const newPath = `/p/${session.patientId}/s/${session.id}`;
        if (window.location.pathname !== newPath) {
          window.history.pushState({ patientId: session.patientId, sessionId: session.id }, "", newPath);
        }
      }
    } else {
      if (window.location.pathname !== "/") {
        window.history.pushState({}, "", "/");
      }
    }
  }, [activeSessionId, sessions]);

  /* ── Handle browser back/forward ── */
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/p\/([^/]+)\/s\/([^/]+)/) || path.match(/^\/patient\/([^/]+)\/session\/([^/]+)/);
      if (match) {
        const [, , sessionId] = match;
        setActiveSessionId(sessionId);
      } else {
        setActiveSessionId(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const activePatient = activeSession ? patients.find((p) => p.id === activeSession.patientId) || null : null;
  const currentResult = (activeSession?.result as AnalyzeResponse | DrugCheckResponse | null) ?? null;

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

  /* ── Load a Demo Scenario ───────────────────── */
  const handleLoadDemo = useCallback(
    (scenario: (typeof DEMO_SCENARIOS)[number]) => {
      // Check if a demo patient for this scenario already exists
      const existingPatient = patients.find((p) => p.id.startsWith(`demo-${scenario.id}-`));

      if (existingPatient) {
        // Find their most recent session
        const existingSessions = sessions
          .filter((s) => s.patientId === existingPatient.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (existingSessions.length > 0) {
          // Redirect to existing session
          setActiveSessionId(existingSessions[0].id);
          return;
        }

        // Patient exists but no sessions — create one
        const newSession: PatientSession = {
          id: generateSessionId(),
          patientId: existingPatient.id,
          mode: scenario.mode,
          name: `Demo: ${scenario.title}`,
          createdAt: new Date().toISOString(),
          result: null,
          imagePreview: null,
          imagePath: scenario.imagePath,
        };
        saveSession(newSession);
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        return;
      }

      // No existing demo patient — create new
      const patientId = `demo-${scenario.id}-${Date.now()}`;
      const now = new Date().toISOString();
      const newPatient: Patient = {
        id: patientId,
        ...scenario.patient,
        createdAt: now,
        updatedAt: now,
      };
      savePatient(newPatient);
      setPatients((prev) => [newPatient, ...prev]);

      const newSession: PatientSession = {
        id: generateSessionId(),
        patientId,
        mode: scenario.mode,
        name: `Demo: ${scenario.title}`,
        createdAt: new Date().toISOString(),
        result: null,
        imagePreview: null,
        imagePath: scenario.imagePath,
      };
      saveSession(newSession);
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
    },
    [patients, sessions],
  );

  /* ── Startup loader gate ────────────────────── */
  if (!appReady) {
    return <StartupLoader onReady={handleStartupReady} />;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground">
      <Sidebar
        patients={patients} sessions={sessions} activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId} onNewSession={handleNewSession}
        onNewSessionForPatient={handleNewSessionForPatient}
        onDeleteSession={handleDeleteSession} onDeletePatient={handleDeletePatient}
        collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onGoHome={() => setActiveSessionId(null)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {activeSession && activePatient ? (
          <>
            <div className="h-14 border-b flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveSessionId(null)}
                  className="h-7 w-7 flex items-center justify-center rounded-md bg-indigo-100 text-indigo-600 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition-colors"
                  title="Back to Home"
                >
                  <HomeIcon className="h-3.5 w-3.5" />
                </button>
                <div className="h-4 w-px bg-border" />
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
          <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
            {/* Hero */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                <Stethoscope className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold leading-tight">DermRx Agent</h1>
                  {isMockMode && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
                      Mock
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  AI-powered dermatology diagnosis &amp; agentic drug safety
                </p>
              </div>
            </div>

            {/* Demo Scenario Cards */}
            <div className="w-full max-w-3xl mb-8">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3 text-center">
                Launch a Demo Scenario
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {DEMO_SCENARIOS.map((scenario) => {
                  const Icon = scenario.accentIcon;
                  return (
                    <button
                      key={scenario.id}
                      onClick={() => handleLoadDemo(scenario)}
                      className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${scenario.borderColor} ${scenario.bgColor}`}
                    >
                      {/* Avatar + Badge row */}
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${scenario.badgeColor}`}>
                          {scenario.badge}
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={scenario.avatarPath}
                          alt={scenario.patient.name}
                          className="h-10 w-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm object-cover bg-slate-100 dark:bg-slate-800"
                        />
                      </div>

                      {/* Icon + Title */}
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-white/80 dark:bg-white/10 flex items-center justify-center shadow-sm">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-tight">{scenario.title}</p>
                          <p className="text-[10px] text-muted-foreground">{scenario.subtitle}</p>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {scenario.description}
                      </p>

                      {/* Expected outcome hint */}
                      <p className="w-full mt-auto pt-2 text-[10px] text-muted-foreground/70 italic leading-snug">
                        {scenario.expectedResult}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {scenario.tags.map((tag, i) => (
                          <span
                            key={tag}
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${scenario.tagColors[i]}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>


          </div>
        )}
      </div>

      {currentResult && (
        <ChatPanel collapsed={chatCollapsed} onToggleCollapse={() => setChatCollapsed(!chatCollapsed)} currentResult={currentResult} sessionId={activeSessionId} />
      )}
      <NewPatientDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setDialogEditOnly(false); }} onSubmit={handleDialogSubmit} initialMode={dialogMode} existingPatient={dialogPatient} editOnly={dialogEditOnly} />
    </div>
  );
}