"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload,
  X,
  AlertTriangle,
  XCircle,
  Loader2,
  Pill,
  Brain,
  Circle,
  Play,
  Check,
  Info,
} from "lucide-react";
import { analyzeImage } from "@/lib/api";
import {
  AnalyzeResponse,
  Patient,
  PatientSession,
  TopScore,
  SafetyFlag,
} from "@/lib/type";
import { saveSession } from "@/lib/storage";
import DrugEvaluationResults from "@/components/drug-evaluation-results";

interface AnalyzePanelProps {
  session: PatientSession;
  patient: Patient;
  onSessionUpdate: (session: PatientSession) => void;
}

type PipelineStage =
  | "idle"
  | "uploading"
  | "classifying"
  | "candidates"
  | "evaluating"
  | "synthesizing"
  | "complete"
  | "error";

interface PipelineStep {
  id: PipelineStage;
  label: string;
  description: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "uploading",
    label: "Image Received",
    description: "Processing uploaded image",
  },
  {
    id: "classifying",
    label: "MedSigLIP Classifying",
    description: "Zero-shot skin condition classification",
  },
  {
    id: "candidates",
    label: "Retrieving Candidates",
    description: "Looking up treatment options from clinical database",
  },
  {
    id: "evaluating",
    label: "DDInter + TxGemma Safety",
    description: "Agentic drug-drug interaction & toxicity checks",
  },
  {
    id: "synthesizing",
    label: "MedGemma Synthesizing",
    description: "Generating clinical report & patient explanation",
  },
];

const STAGE_ORDER: PipelineStage[] = [
  "uploading",
  "classifying",
  "candidates",
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

export default function AnalyzePanel({
  session,
  patient,
  onSessionUpdate,
}: AnalyzePanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    session.imagePreview || null,
  );

  // Medications come from the patient record
  const medications = patient.medications;
  const [stage, setStage] = useState<PipelineStage>(
    session.result ? "complete" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(
    session.result as AnalyzeResponse | null,
  );


  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setFile(droppedFile);
      const base64 = await fileToBase64(droppedFile);
      setPreview(base64);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const base64 = await fileToBase64(selectedFile);
      setPreview(base64);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setError(null);
    setResult(null);
    setStage("uploading");

    try {
      const timer1 = setTimeout(() => setStage("classifying"), 1500);
      const timer2 = setTimeout(() => setStage("candidates"), 4000);
      const timer3 = setTimeout(() => setStage("evaluating"), 6000);
      const timer4 = setTimeout(() => setStage("synthesizing"), 12000);

      const response = await analyzeImage(file, medications);

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);

      setResult(response);
      setStage("complete");

      const updatedSession: PatientSession = {
        ...session,
        name:
          response.classification?.display_name ||
          `Analysis ${new Date().toLocaleTimeString()}`,
        result: response,
        imagePreview: preview,
      };
      onSessionUpdate(updatedSession);
      saveSession(updatedSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setStage("error");
    }
  };



  const getTierBadge = (tier: number) => {
    switch (tier) {
      case 1:
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            Tier 1 — Treatable
          </Badge>
        );
      case 2:
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Tier 2 — Safety / Referral
          </Badge>
        );
      case 3:
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Tier 3 — Specialist Required
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown Tier</Badge>;
    }
  };

  const getConfidenceColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "HIGH":
        return "bg-emerald-500";
      case "MEDIUM":
        return "bg-amber-500";
      case "LOW":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getConfidenceBadgeColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "HIGH":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "MEDIUM":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "LOW":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatScore = (score: unknown): string => {
    if (score === null || score === undefined) return "—";
    const num = Number(score);
    if (isNaN(num)) return "—";
    return `${(num * 100).toFixed(1)}%`;
  };

  const capitalize = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

  // ======================== LOADING STATE ========================
  if (
    stage !== "idle" &&
    stage !== "complete" &&
    stage !== "error" &&
    !result
  ) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg">
              <Brain className="h-8 w-8 text-white animate-pulse" />
            </div>
            <h2 className="text-lg font-semibold">Analyzing Image</h2>
            <p className="text-sm text-muted-foreground">
              Running agentic diagnostic pipeline...
            </p>
          </div>

          {/* Pipeline Steps */}
          <div className="space-y-1">
            {PIPELINE_STEPS.map((step, i) => {
              const status = getStepStatus(step.id, stage);
              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${
                    status === "current"
                      ? "bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800"
                      : status === "complete"
                        ? "bg-emerald-50/50 dark:bg-emerald-900/5"
                        : ""
                  }`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="mt-0.5">
                    {status === "complete" ? (
                      <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    ) : status === "current" ? (
                      <div className="h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center animate-pulse">
                        <Play className="h-3 w-3 text-white fill-white" />
                      </div>
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-slate-200 dark:border-slate-700">
                        <Circle className="h-full w-full text-transparent" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        status === "complete"
                          ? "text-emerald-600 dark:text-emerald-400 line-through"
                          : status === "current"
                            ? "text-indigo-700 dark:text-indigo-300"
                            : "text-slate-400 dark:text-slate-600"
                      }`}
                    >
                      {step.label}
                    </p>
                    {status === "current" && (
                      <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
                        {step.description}
                      </p>
                    )}
                  </div>
                  {status === "current" && (
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500 mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Preview thumbnail */}
          {preview && (
            <div className="flex justify-center">
              <img
                src={preview}
                alt="Analyzing"
                className="h-20 w-20 rounded-lg object-cover opacity-60"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ======================== RESULTS STATE ========================
  if (result && stage === "complete") {
    const isTier1 = result.classification?.tier === 1;
    const isTier2 = result.classification?.tier === 2;
    const isTier3 = result.classification?.tier === 3;
    const noMedsEntered =
      medications.length === 0 &&
      (!result.report?.rejected_drugs ||
        result.report.rejected_drugs.length === 0);

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        {/* Reset Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Analysis Results</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setResult(null);
              setFile(null);
              setPreview(null);
              setStage("idle");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            New Analysis
          </Button>
        </div>

        {/* Classification Section */}
        {result.classification && (
          <div className="animate-slide-in space-y-4">
            {/* Image + Diagnosis Card */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className={`${preview ? "grid grid-cols-1 md:grid-cols-[220px_1fr]" : ""}`}>
                  {/* Image — Left */}
                  {preview && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 flex items-center justify-center md:p-5">
                      <img
                        src={preview}
                        alt="Clinical image"
                        className="rounded-xl object-cover w-full max-h-52 md:max-h-none md:h-full md:aspect-square shadow-sm"
                      />
                    </div>
                  )}

                  {/* Diagnosis — Right */}
                  <div className="p-5 md:p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">
                          Diagnosis
                        </p>
                        <h3 className="text-xl font-bold capitalize text-foreground leading-tight">
                          {result.classification.display_name}
                        </h3>
                        {result.classification.treatment_class && (
                          <div className="mt-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 rounded-md px-2 py-1 capitalize">
                              <Pill className="h-3 w-3" />
                              {result.classification.treatment_class.replace(/_/g, " ")}
                            </span>
                            {(() => {
                              const TREATMENT_INFO: Record<string, { desc: string; includes: string[] }> = {
                                antifungal: { desc: "Medications targeting fungal organisms", includes: ["Tinea", "Ringworm", "Candidiasis"] },
                                antibiotic: { desc: "Medications targeting bacterial pathogens", includes: ["Impetigo", "Cellulitis"] },
                                antiviral: { desc: "Medications targeting viral replication", includes: ["Herpes", "Shingles", "Varicella"] },
                                wart_treatment: { desc: "Targeted wart removal therapies", includes: ["Verruca", "Molluscum Contagiosum"] },
                                topical_steroid: { desc: "Anti-inflammatory corticosteroid therapy", includes: ["Eczema", "Atopic Dermatitis", "Contact Dermatitis"] },
                                psoriasis_treatment: { desc: "Keratolytic and immunomodulatory agents", includes: ["Plaque Psoriasis", "Pityriasis"] },
                                acne_treatment: { desc: "Comedolytic and anti-inflammatory therapy", includes: ["Acne Vulgaris", "Rosacea", "Cystic Acne"] },
                                antihistamine: { desc: "Histamine receptor antagonists", includes: ["Urticaria", "Hives", "Allergic Reaction"] },
                                antiparasitic: { desc: "Agents targeting parasitic organisms", includes: ["Scabies", "Lice", "Insect Bites"] },
                                lichen_treatment: { desc: "Immunosuppressive topical therapy", includes: ["Lichen Planus", "Lichen Sclerosus"] },
                                nail_treatment: { desc: "Antifungal and restorative nail therapy", includes: ["Onychomycosis", "Nail Dystrophy"] },
                              };
                              const info = TREATMENT_INFO[result.classification!.treatment_class];
                              if (!info) return null;
                              return (
                                <div className="mt-2 space-y-1">
                                  <p className="text-xs text-muted-foreground">{info.desc}</p>
                                  <div className="flex flex-wrap gap-1">
                                    {info.includes.map((t) => (
                                      <span key={t} className="text-[10px] text-muted-foreground/60 bg-muted/50 rounded px-1.5 py-0.5">
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      {getTierBadge(result.classification.tier)}
                    </div>

                    {/* Confidence */}
                    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Confidence
                        </span>
                        <span className="text-xl font-bold tabular-nums text-foreground">
                          {formatScore(result.classification.confidence)}
                        </span>
                      </div>
                      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${getConfidenceColor(result.classification.confidence_level)}`}
                          style={{
                            width: `${Math.min(
                              (result.classification.confidence || 0) * 100,
                              100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Safety Flags */}
                    {result.classification.safety_flags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {result.classification.safety_flags.map((flag: SafetyFlag) => (
                          <Badge
                            key={flag.display_name}
                            variant="destructive"
                            className="text-xs"
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {flag.display_name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Differential Diagnosis Card */}
            {result.classification.top_scores &&
              (result.classification.top_scores as TopScore[]).filter(
                (s) => s.score > 0,
              ).length > 1 && (
              <Card>
                <CardContent className="p-5 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Differential Diagnosis
                  </p>
                  <div className="space-y-1.5">
                    {(result.classification.top_scores as TopScore[])
                      .filter((s) => s.score > 0)
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 5)
                      .map((entry, index) => {
                        const pct = Math.min(entry.score * 100, 100);
                        const isTop = index === 0;
                        return (
                          <div
                            key={entry.category}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                              isTop
                                ? "bg-indigo-50/80 dark:bg-indigo-950/15 border border-indigo-200/50 dark:border-indigo-800/30"
                                : ""
                            }`}
                          >
                            <span className="text-[11px] font-bold tabular-nums text-muted-foreground/40 w-5 text-right">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-sm truncate ${
                                      isTop
                                        ? "font-semibold text-foreground"
                                        : "font-medium text-muted-foreground"
                                    }`}
                                  >
                                    {entry.display_name}
                                  </span>
                                  {entry.tier > 1 && (
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                      entry.tier === 2
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    }`}>
                                      Tier {entry.tier}
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`text-sm font-mono tabular-nums ml-2 ${
                                    isTop
                                      ? "font-bold text-foreground"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {formatScore(entry.score)}
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${
                                    isTop ? "bg-indigo-500" : "bg-indigo-400/30"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ========== TIER 2 REFERRAL ========== */}
        {isTier2 && (
          <Card className="animate-slide-in border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base text-amber-700 dark:text-amber-400">
                  Specialist Referral Recommended
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                This condition has been classified as <strong>Tier 2</strong> —
                it requires specialist evaluation before treatment can be
                recommended.
              </p>
              <div className="bg-white dark:bg-background rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-medium mb-1">Recommendation</p>
                <p className="text-sm text-muted-foreground">
                  Refer patient to a dermatologist for clinical assessment.
                  Automated treatment selection has been intentionally withheld
                  for patient safety.
                </p>
              </div>
              {result.classification?.safety_flags &&
                result.classification.safety_flags.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
                      Safety Flags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.classification.safety_flags.map((flag: SafetyFlag) => (
                        <Badge
                          key={flag.display_name}
                          className="bg-amber-100 text-amber-700 text-xs"
                        >
                          {flag.display_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* ========== TIER 3 URGENT ========== */}
        {isTier3 && (
          <Card className="animate-slide-in border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <CardTitle className="text-base text-red-700 dark:text-red-400">
                  Urgent Care Required
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-red-800 dark:text-red-300">
                This condition has been classified as <strong>Tier 3</strong> —
                it requires immediate specialist attention. No automated
                treatment recommendations are provided.
              </p>
              <div className="bg-white dark:bg-background rounded-lg p-4 border border-red-200 dark:border-red-800">
                <p className="text-sm font-medium mb-1">Urgent Action</p>
                <p className="text-sm text-muted-foreground">
                  Refer patient immediately to a dermatologist or appropriate
                  specialist. This condition may require biopsy, systemic
                  treatment, or further diagnostic workup.
                </p>
              </div>
              {result.classification?.safety_flags &&
                result.classification.safety_flags.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1.5">
                      Safety Flags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.classification.safety_flags.map((flag: SafetyFlag) => (
                        <Badge
                          key={flag.display_name}
                          variant="destructive"
                          className="text-xs"
                        >
                          {flag.display_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* ========== TIER 1 — DRUG EVALUATION + REPORT ========== */}
        {isTier1 && (
          <>
            {/* No medications notice */}
            {noMedsEntered && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    No patient medications entered — drug interaction checking
                    was skipped. All candidates show as SAFE because no
                    conflicts were possible.
                  </p>
                </div>
              </div>
            )}

            {/* Agentic Drug Evaluation */}
            {result.candidates_evaluated.length > 0 && (
              <DrugEvaluationResults
                candidates={result.candidates_evaluated}
                selectedDrug={result.selected_drug}
              />
            )}

            {/* Clinical Report */}
            {result.report && (
              <Card
                className="animate-slide-in overflow-hidden"
                style={{ animationDelay: "0.2s" }}
              >
                <div className="px-6 pt-1 pb-6 space-y-5">
                  <h3 className="text-[15px] font-semibold tracking-tight">
                    Clinical Report
                  </h3>

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
                    <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">
                      {result.report.recommended_treatment}
                    </p>
                  </div>

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

                  {result.report.rejected_drugs &&
                    result.report.rejected_drugs.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
                          Alternatives Considered
                        </p>
                        <div className="space-y-1">
                          {result.report.rejected_drugs.map(
                            (
                              item: string | { drug: string; reason: string },
                              idx: number,
                            ) => {
                              const drugName =
                                typeof item === "string" ? item : item.drug;
                              const rejectionReason =
                                typeof item === "string" ? null : item.reason;
                              const candidate =
                                result.candidates_evaluated.find(
                                  (c) => c.drug_name === drugName,
                                );
                              return (
                                <div
                                  key={drugName || idx}
                                  className="flex items-start gap-2.5 py-1.5"
                                >
                                  <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium capitalize">
                                        {drugName}
                                      </span>
                                      <span
                                        className={`text-[10px] uppercase tracking-widest font-bold ${
                                          candidate?.status === "REJECTED"
                                            ? "text-red-500"
                                            : "text-muted-foreground"
                                        }`}
                                      >
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
          </>
        )}

        {/* Safety Note */}
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

  // ======================== INPUT FORM ========================
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  {error}
                </p>
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

        {/* Upload Area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className={`border-2 border-dashed rounded-xl transition-colors ${
            preview
              ? "border-indigo-300 bg-indigo-50/50 dark:border-indigo-700 dark:bg-indigo-900/10 p-6"
              : "border-muted-foreground/20 hover:border-indigo-300 hover:bg-indigo-50/30 p-0"
          }`}
        >
          {preview ? (
            <div className="space-y-3 text-center">
              <img
                src={preview}
                alt="Preview"
                className="max-h-56 rounded-lg mx-auto object-cover shadow-sm"
              />
              <p className="text-sm font-medium">{file?.name}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
              >
                <X className="h-3 w-3 mr-1" />
                Remove
              </Button>
            </div>
          ) : (
            <label className="cursor-pointer block">
              {/* Main upload zone */}
              <div className="p-8 text-center space-y-4">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center shadow-sm">
                  <Upload className="h-7 w-7 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    Upload Skin Image
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Drag & drop or{" "}
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                      click to browse
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    PNG, JPG, HEIC up to 10MB
                  </p>
                </div>
              </div>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          )}
        </div>

        {/* Patient Medications (from patient record) */}
        {medications.length > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Pill className="h-4 w-4 text-indigo-500 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400">
                  {patient.name}&apos;s Medications ({medications.length})
                </p>
                <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 capitalize">
                  {medications.join(", ")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Analyze Button */}
        <Button
          onClick={handleAnalyze}
          disabled={!file || (stage !== "idle" && stage !== "error")}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          size="lg"
        >
          <Upload className="h-4 w-4 mr-2" />
          Analyze Skin Image
        </Button>

        <p className="text-[10px] text-center text-muted-foreground">
          For clinical decision support only. Not a substitute for professional
          medical diagnosis.
        </p>
      </div>
    </div>
  );
}
