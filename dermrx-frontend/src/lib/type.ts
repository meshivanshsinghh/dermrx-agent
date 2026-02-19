export interface Patient {
  id: string;
  name: string;
  age?: number;
  sex?: "male" | "female" | "other";
  medications: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientSession {
  id: string;
  patientId: string;
  name: string;
  createdAt: string;
  mode: "analyze" | "drug_check";
  result: AnalyzeResponse | DrugCheckResponse | null;
  imagePreview?: string | null;
}

export interface TopScore {
  category: string;
  display_name: string;
  score: number;
  tier: number;
}

export interface SafetyFlag {
  category: string;
  display_name: string;
  confidence: number;
  urgency: string;
}

export interface Classification {
  predicted_category: string;
  display_name: string;
  tier: number;
  confidence: number;
  confidence_level: string;
  treatment_class: string | null;
  urgency: string | null;
  referral: string | null;
  reason: string | null;
  safety_flags: SafetyFlag[];
  top_scores: TopScore[];
  all_scores?: Record<string, number>;
}

export interface DDIFinding {
  drug_name: string;
  finding_type: string;
  severity: string;
  description: string;
  action: string;
  management?: string | null;
  mechanism?: string | null;
}

export interface CandidateEvaluation {
  drug_name: string;
  status: "SAFE" | "CAUTION" | "REJECTED";
  reason: string;
  findings: DDIFinding[];
}

export interface ClinicalReport {
  clinical_summary: string;
  drug_name: string;
  recommended_treatment: string;
  reasoning_trace: string;
  patient_explanation: string;
  rejected_drugs: Array<string | { drug: string; reason: string }>;
}

export interface AnalyzeResponse {
  mode: "analyze" | "drug_check";
  classification: Classification | null;
  candidates_evaluated: CandidateEvaluation[];
  selected_drug: string | null;
  report: ClinicalReport | null;
  safety_note?: string;
  error?: string;
}

export interface DrugCheckResponse {
  mode: "drug_check";
  classification: null;
  candidates_evaluated: CandidateEvaluation[];
  selected_drug: string | null;
  report: ClinicalReport | null;
  safety_note?: string;
  error?: string;
}

export interface HealthResponse {
  status: string;
  models_loaded?: Record<string, boolean>;
}