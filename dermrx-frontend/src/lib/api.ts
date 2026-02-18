const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Classification {
  predicted_category: string;
  display_name: string;
  tier: number;
  confidence: number;
  confidence_level: string;
  treatment_class: string;
  safety_flags: string[];
  top_scores: Record<string, number>;
  all_scores?: Record<string, number>;
}

export interface DDIFinding {
  drug_name: string;
  finding_type: string;
  severity: string;
  description: string;
  action: string;
}

export interface CandidateEvaluation {
  drug_name: string;
  status: "SAFE" | "CAUTION" | "REJECTED";
  reason: string;
  findings: DDIFinding[];
}

export interface Report {
  clinical_summary: string;
  recommended_treatment: string;
  drug_name: string;
  reasoning_trace: string;
  patient_explanation: string;
  rejected_drugs: string[];
}

export interface AnalyzeResponse {
  mode: "analyze" | "drug_check";
  classification: Classification | null;
  candidates_evaluated: CandidateEvaluation[];
  selected_drug: string | null;
  report: Report | null;
  safety_note?: string;
  error?: string;
}

export interface DrugCheckResponse {
  mode: "drug_check";
  classification: null;
  candidates_evaluated: CandidateEvaluation[];
  selected_drug: null;
  report: null;
  safety_note?: string;
  error?: string;
}

export interface DrugSearchResult {
  name: string;
  id: string;
}

export interface HealthResponse {
  status: string;
  models_loaded?: Record<string, boolean>;
}

export interface PatientSession {
  id: string;
  name: string;
  createdAt: string;
  mode: "analyze" | "drug_check";
  result: AnalyzeResponse | DrugCheckResponse | null;
  imagePreview?: string | null;
}

export async function analyzeImage(
  file: File,
  patientMedications: string[]
): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (patientMedications.length > 0) {
    formData.append("patient_medications", patientMedications.join(","));
  }

  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Analysis failed (${res.status})`);
  }

  return res.json();
}

export async function drugCheck(
  drugNames: string[],
  patientMedications: string[]
): Promise<DrugCheckResponse> {
  const params = new URLSearchParams();
  drugNames.forEach((d) => params.append("drug_names", d));
  patientMedications.forEach((m) => params.append("patient_medications", m));

  const res = await fetch(`${API_BASE}/api/drug-check?${params.toString()}`, {
    method: "POST",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Drug check failed (${res.status})`);
  }

  return res.json();
}

export async function searchDrugs(query: string): Promise<string[]> {
  if (!query || query.length < 2) return [];

  const res = await fetch(
    `${API_BASE}/api/drugs/search?q=${encodeURIComponent(query)}`
  );

  if (!res.ok) return [];

  const data = await res.json();
  return data.results || data || [];
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}

// ==================== LOCAL STORAGE HELPERS ====================

const STORAGE_KEY = "dermrx_sessions";

export function getSessions(): PatientSession[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSession(session: PatientSession): void {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function deleteSession(id: string): void {
  const sessions = getSessions().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}