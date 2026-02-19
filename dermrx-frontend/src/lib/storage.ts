import { Patient, PatientSession } from "./type";

const PATIENTS_KEY = "dermrx_patients";
const SESSIONS_KEY = "dermrx_sessions";

// ── Patients ──

export function getPatients(): Patient[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(PATIENTS_KEY) || "[]"); }
  catch { return []; }
}

export function getPatient(id: string): Patient | null {
  return getPatients().find((p) => p.id === id) || null;
}

export function savePatient(patient: Patient): void {
  const patients = getPatients();
  const idx = patients.findIndex((p) => p.id === patient.id);
  if (idx >= 0) patients[idx] = { ...patient, updatedAt: new Date().toISOString() };
  else patients.unshift(patient);
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
}

export function deletePatient(id: string): void {
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(getPatients().filter((p) => p.id !== id)));
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(getSessions().filter((s) => s.patientId !== id)));
}

// ── Sessions ──

export function getSessions(): PatientSession[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]"); }
  catch { return []; }
}

export function getSessionsForPatient(patientId: string): PatientSession[] {
  return getSessions().filter((s) => s.patientId === patientId);
}

export function saveSession(session: PatientSession): void {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) sessions[idx] = session;
  else sessions.unshift(session);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function deleteSession(id: string): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(getSessions().filter((s) => s.id !== id)));
}

// ── ID Generators ──

export function generatePatientId(): string {
  return `p_${Math.random().toString(36).substring(2, 8)}`;
}

export function generateSessionId(): string {
  return `s_${Math.random().toString(36).substring(2, 8)}`;
}