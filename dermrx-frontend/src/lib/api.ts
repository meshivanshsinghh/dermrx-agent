import type {
  AnalyzeResponse,
  DrugCheckResponse,
  HealthResponse,
  ChatApiResponse,
} from "./type";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function analyzeImage(
  file: File,
  patientMedications: string[],
): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append(
    "patient_medications",
    patientMedications.length > 0 ? patientMedications.join(",") : "none",
  );
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
  patientMedications: string[],
): Promise<DrugCheckResponse> {
  const res = await fetch(`${API_BASE}/api/drug-check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      drug_names: drugNames,
      patient_medications: patientMedications,
    }),
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
    `${API_BASE}/api/drugs/search?q=${encodeURIComponent(query)}`,
  );

  if (!res.ok) return [];

  const data = await res.json();
  return (data.results || []).map((r: { drug_name: string }) => r.drug_name);
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}

export async function sendChatMessage(
  sessionId: string,
  message: string,
  context?: AnalyzeResponse | DrugCheckResponse | null,
): Promise<ChatApiResponse> {
  const body: Record<string, unknown> = {
    session_id: sessionId,
    message,
  };
  // Send context only on first message (when context is provided)
  if (context) {
    body.context = context;
  }

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Chat failed (${res.status})`);
  }

  return res.json();
}

export async function clearChatSession(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/api/chat/${sessionId}`, {
    method: "DELETE",
  });
}