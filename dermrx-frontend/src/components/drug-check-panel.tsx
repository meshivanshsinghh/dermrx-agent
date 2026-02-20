"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  X,
  XCircle,
  AlertTriangle,
  Loader2,
  Pill,
  Shield,
  Search,
  Zap,
  Brain,
  Check,
  ArrowRight,
  Database,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { drugCheck, searchDrugs } from "@/lib/api";
import {
  DrugCheckResponse,
  Patient,
  PatientSession,
} from "@/lib/type";
import { saveSession } from "@/lib/storage";
import DrugEvaluationResults from "@/components/drug-evaluation-results";

type PipelineStage =
  | "idle"
  | "checking"
  | "evaluating"
  | "synthesizing"
  | "complete"
  | "error";

interface PipelineStep {
  id: PipelineStage;
  label: string;
  description: string;
  agentAction: string;
  detail: string;
  subSteps: string[];
  icon: any;
  imagePath: string;
  source: string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "checking",
    label: "Cross-Referencing Databases",
    description: "Querying evidence-based databases for candidates",
    agentAction: "Checking drug combinations against patient record",
    detail: "The agent queries MED-RT and DDInter 2.0 to identify known drug-drug, food, and disease interactions. All candidates are evaluated against the patient's current medication list.",
    subSteps: ["Querying DDInter 2.0 API", "Filtering known interactions", "Mapping to severity tiers"],
    icon: Database,
    imagePath: "/pipeline/step-medrt.svg",
    source: "MED-RT + DDInter 2.0",
    accentColor: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    id: "evaluating",
    label: "Agentic Drug Safety Loop",
    description: "Evaluating each candidate for drug interactions & toxicity",
    agentAction: "Agent evaluating each drug candidate for safety",
    detail: "For each candidate, the agent runs TxGemma-2B molecular toxicity prediction using PubChem SMILES strings across 6 safety endpoints.",
    subSteps: ["Running TxGemma-2B on PubChem SMILES (6 endpoints)", "Evaluating: Skin Reaction, DILI, CYP2C9, CYP3A4, hERG, ClinTox", "Rejecting unsafe → flagging precautions"],
    icon: ShieldCheck,
    imagePath: "/pipeline/step-txgemma.svg",
    source: "TxGemma-2B + PubChem",
    accentColor: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  {
    id: "synthesizing",
    label: "MedGemma Clinical Synthesis",
    description: "Generating clinical report from safety findings",
    agentAction: "MedGemma synthesizing clinical safety report",
    detail: "Google's MedGemma-4B receives the pipeline context — the checked drugs, findings, and toxicities — and generates a structured clinical report.",
    subSteps: ["Assembling safety context", "Generating clinical reasoning", "Formatting patient explanation"],
    icon: Sparkles,
    imagePath: "/pipeline/step-medgemma.svg",
    source: "google/medgemma-4b-it",
    accentColor: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
];

const STAGE_ORDER: PipelineStage[] = [
  "checking",
  "evaluating",
  "synthesizing",
  "complete",
];

function getStepStatus(
  step: PipelineStage,
  current: PipelineStage,
): "pending" | "current" | "complete" {
  const stepIdx = STAGE_ORDER.indexOf(step);
  const currentIdx = STAGE_ORDER.indexOf(current);
  if (stepIdx < currentIdx) return "complete";
  if (stepIdx === currentIdx) return "current";
  return "pending";
}

interface DrugCheckPanelProps {
  session: PatientSession;
  patient: Patient;
  onSessionUpdate: (session: PatientSession) => void;
}

export default function DrugCheckPanel({
  session,
  patient,
  onSessionUpdate,
}: DrugCheckPanelProps) {
  const [drugNames, setDrugNames] = useState<string[]>([]);
  const [drugInput, setDrugInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Medications come from the patient record
  const medications = patient.medications;

  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<PipelineStage>(
    session.result ? "complete" : "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DrugCheckResponse | null>(
    session.result as DrugCheckResponse | null
  );

  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (drugInput.length < 2) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const results = await searchDrugs(drugInput);
      setSuggestions(results);
      setShowSuggestions(true);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [drugInput]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addDrug = (name?: string) => {
    const trimmed = (name || drugInput).trim();
    if (trimmed && !drugNames.includes(trimmed)) {
      setDrugNames([...drugNames, trimmed]);
      setDrugInput("");
      setShowSuggestions(false);
    }
  };

  const removeDrug = (drug: string) => {
    setDrugNames(drugNames.filter((d) => d !== drug));
  };

  const loadDemoDrugs = () => {
    setDrugNames(["fluconazole", "terbinafine", "clotrimazole"]);
  };

  const handleCheck = async () => {
    if (drugNames.length === 0) return;

    setError(null);
    setResult(null);
    setLoading(true);
    setStage("checking");

    const timers: ReturnType<typeof setTimeout>[] = [];

    try {
      timers.push(setTimeout(() => setStage("evaluating"), 3500));
      timers.push(setTimeout(() => setStage("synthesizing"), 7000));

      const minDuration = new Promise((r) => setTimeout(r, 10000));
      const [response] = await Promise.all([
        drugCheck(drugNames, medications),
        minDuration,
      ]);

      timers.forEach(clearTimeout);

      setResult(response);
      setStage("complete");

      const updatedSession: PatientSession = {
        ...session,
        name: `Drug Check: ${drugNames.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")}`,
        result: response,
      };
      onSessionUpdate(updatedSession);
      saveSession(updatedSession);
    } catch (err) {
      timers.forEach(clearTimeout);
      setError(err instanceof Error ? err.message : "Drug check failed");
      setStage("error");
    } finally {
      setLoading(false);
    }
  };

  // ======================== LOADING STATE ========================
  if (
    stage !== "idle" &&
    stage !== "complete" &&
    stage !== "error" &&
    !result
  ) {
    const currentStep = PIPELINE_STEPS.find((s) => s.id === stage) || PIPELINE_STEPS[0];
    const currentIdx = STAGE_ORDER.indexOf(stage);
    const StepIcon = currentStep.icon;

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Agentic Pipeline</h2>
            <p className="text-sm text-muted-foreground">
              Step {currentIdx + 1} of {PIPELINE_STEPS.length} — {currentStep.agentAction}
            </p>
          </div>

          {/* Progress bar */}
          <div className="relative">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-1000 ease-out"
                style={{ width: `${((currentIdx + 0.5) / PIPELINE_STEPS.length) * 100}%` }}
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-between px-0">
              {PIPELINE_STEPS.map((step) => {
                const status = getStepStatus(step.id, stage);
                return (
                  <div
                    key={step.id}
                    className={`h-3 w-3 rounded-full border-2 transition-all duration-300 ${status === "complete"
                        ? "bg-emerald-500 border-emerald-500 scale-100"
                        : status === "current"
                          ? "bg-indigo-500 border-indigo-500 scale-125 ring-4 ring-indigo-500/20"
                          : "bg-background border-muted-foreground/20 scale-90"
                      }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Active Step Card */}
          <div className={`rounded-2xl border-2 ${currentStep.borderColor} ${currentStep.bgColor} overflow-hidden animate-slide-in transition-all duration-500`} key={currentStep.id}>
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${currentStep.bgColor} border ${currentStep.borderColor} flex items-center justify-center`}>
                  <StepIcon className={`h-5 w-5 ${currentStep.accentColor}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold ${currentStep.accentColor}`}>{currentStep.label}</h3>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{currentStep.source}</p>
                </div>
              </div>
              <Loader2 className={`h-5 w-5 animate-spin ${currentStep.accentColor}`} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-0">
              <div className="bg-muted/30 flex items-center justify-center p-6 md:border-r border-border/30 min-h-[180px]">
                <img
                  src={currentStep.imagePath}
                  alt={currentStep.label}
                  className="max-h-40 max-w-full object-contain rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider ${currentStep.accentColor} mb-1.5`}>
                    What the agent is doing
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {currentStep.detail}
                  </p>
                </div>

                <div className="space-y-1.5">
                  {currentStep.subSteps.map((sub, i) => (
                    <div key={i} className="flex items-center gap-2 animate-slide-in" style={{ animationDelay: `${i * 0.3}s` }}>
                      <ArrowRight className={`h-3 w-3 ${currentStep.accentColor} shrink-0 animate-pulse-dot`} style={{ animationDelay: `${i * 0.5}s` }} />
                      <span className="text-xs text-muted-foreground">{sub}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ======================== RESULTS STATE ========================



  if (result) {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-base sm:text-lg font-semibold">Drug Safety Results</h2>
        </div>

        {result.candidates_evaluated.length > 0 && (
          <DrugEvaluationResults
            candidates={result.candidates_evaluated}
            selectedDrug={result.selected_drug}
            title="Safety Evaluation"
          />
        )}

        {/* Clinical Report from MedGemma */}
        {result.report && (
          <Card className="animate-slide-in overflow-hidden" style={{ animationDelay: "0.2s" }}>
            <div className="px-4 sm:px-6 pt-1 pb-4 sm:pb-6 space-y-4 sm:space-y-5">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-indigo-500" />
                <h3 className="text-[15px] font-semibold tracking-tight">
                  Clinical Report
                </h3>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
                  Summary
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {result.report.clinical_summary}
                </p>
              </div>

              <div className="border-l-[3px] border-emerald-500 pl-4 py-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
                  Recommended Treatment
                </p>
                <p className="text-base font-semibold capitalize text-foreground">
                  {result.report.drug_name}
                </p>
                {result.report.recommended_treatment && (
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">
                    {result.report.recommended_treatment}
                  </p>
                )}
              </div>

              {result.report.reasoning_trace && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
                    Clinical Reasoning
                  </p>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {result.report.reasoning_trace}
                    </p>
                  </div>
                </div>
              )}

              {result.report.patient_explanation && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
                    For the Patient
                  </p>
                  <blockquote className="border-l-2 border-border pl-4 py-1">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {result.report.patient_explanation}
                    </p>
                  </blockquote>
                </div>
              )}

              {result.report.rejected_drugs && result.report.rejected_drugs.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
                    Alternatives Considered
                  </p>
                  <div className="space-y-1">
                    {result.report.rejected_drugs.map(
                      (item: string | { drug: string; reason: string }, idx: number) => {
                        const drugName = typeof item === "string" ? item : item.drug;
                        const rejectionReason = typeof item === "string" ? null : item.reason;
                        const candidate = result.candidates_evaluated.find(
                          (c) => c.drug_name === drugName,
                        );
                        return (
                          <div key={drugName || idx} className="flex items-start gap-2.5 py-1.5">
                            <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium capitalize">{drugName}</span>
                                <span className={`text-[10px] uppercase tracking-widest font-bold ${candidate?.status === "REJECTED" ? "text-red-500" : "text-muted-foreground"
                                  }`}>
                                  {candidate?.status || "avoided"}
                                </span>
                              </div>
                              {(rejectionReason || candidate?.reason) && (
                                <p className="text-xs text-muted-foreground/70 mt-0.5">
                                  {rejectionReason || candidate?.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {result.safety_note && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {result.safety_note}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Input form
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg space-y-4 sm:space-y-6">
        <div className="text-center space-y-1">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
            <Pill className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold">Drug Safety Check</h2>
          <p className="text-sm text-muted-foreground">
            Check drug interactions against {patient.name}&apos;s medications
          </p>
        </div>

        {error && stage === "error" && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => {
                    setError(null);
                    setStage("idle");
                  }}
                >
                  Try again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Drug Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Drugs to Check</label>
          <div className="relative" ref={suggestionsRef}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={drugInput}
                  onChange={(e) => setDrugInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addDrug();
                  }}
                  onFocus={() =>
                    suggestions.length > 0 && setShowSuggestions(true)
                  }
                  placeholder="Search drug name..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => addDrug()}>
                Add
              </Button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-neutral-900 border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => addDrug(s)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors capitalize"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {drugNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {drugNames.map((drug) => (
                <Badge
                  key={drug}
                  className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-pointer capitalize"
                  onClick={() => removeDrug(drug)}
                >
                  <Pill className="h-3 w-3 mr-1" />
                  {drug}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}

          {/* Demo Quick-Fill — Drugs */}
          {drugNames.length === 0 && (
            <button
              onClick={loadDemoDrugs}
              className="flex items-center gap-2 text-xs text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors mt-1"
            >
              <Zap className="h-3 w-3" />
              <span>
                Try demo: <strong>fluconazole</strong>, <strong>terbinafine</strong>, <strong>clotrimazole</strong>
              </span>
            </button>
          )}
        </div>

        {/* Patient Medications (from patient record) */}
        {medications.length > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Pill className="h-4 w-4 text-indigo-500 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400">
                  {patient.name}&apos;s Current Medications ({medications.length})
                </p>
                <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 capitalize">
                  {medications.join(", ")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Check Button */}
        <Button
          onClick={handleCheck}
          disabled={drugNames.length === 0 || loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          size="lg"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Shield className="h-4 w-4 mr-2" />
          )}
          Check Drug Safety
        </Button>

        <p className="text-[10px] text-center text-muted-foreground">
          Uses DDInter 2.0 database. Always verify with clinical pharmacist.
        </p>
      </div>
    </div>
  );
}