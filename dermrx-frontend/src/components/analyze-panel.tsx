"use client";

import { useState, useCallback, useEffect } from "react";
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
  Eye,
  FlaskConical,
  Search,
  ShieldCheck,
  FileText,
  ArrowRight,
  Database,
  Microscope,
  Sparkles,
  Download,
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
import { exportClinicalReportPDF } from "@/lib/pdf-export";

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
  agentAction: string;
  detail: string;
  subSteps: string[];
  icon: typeof Brain;
  imagePath: string;
  source: string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "uploading",
    label: "Image Received",
    description: "Processing uploaded dermatological image",
    agentAction: "Preparing clinical image for analysis",
    detail: "The agent validates image quality, normalizes resolution, and prepares the input tensor for MedSigLIP's vision encoder.",
    subSteps: ["Validating image format & quality", "Normalizing resolution for model input", "Preparing vision encoder tensor"],
    icon: Upload,
    imagePath: "/pipeline/step-upload.svg",
    source: "Input Processing",
    accentColor: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/20",
    borderColor: "border-slate-200 dark:border-slate-800",
  },
  {
    id: "classifying",
    label: "MedSigLIP Classification",
    description: "Zero-shot skin condition classification across 76 clinical prompts",
    agentAction: "Running MedSigLIP across 22 dermatological conditions",
    detail: "Google's MedSigLIP model performs zero-shot classification by matching the clinical image against 76 curated medical text prompts spanning 22 skin conditions across 3 clinical tiers.",
    subSteps: ["Encoding image with MedSigLIP vision encoder", "Matching against 76 clinical text prompts", "Aggregating scores across 22 conditions", "Applying confidence thresholds (HIGH/MED/LOW)"],
    icon: Eye,
    imagePath: "/pipeline/step-medsiglip.svg",
    source: "google/medsiglip-448",
    accentColor: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-900/20",
    borderColor: "border-violet-200 dark:border-violet-800",
  },
  {
    id: "candidates",
    label: "Treatment Candidate Retrieval",
    description: "Querying evidence-based treatment database for drug candidates",
    agentAction: "Matching diagnosis to clinically-ranked drug candidates",
    detail: "The agent queries a curated treatment table built from MED-RT (FDA/VA National Library of Medicine) and cross-referenced with DDInter 2.0. Candidates are ranked by clinical priority and verified for drug interaction data availability.",
    subSteps: ["Mapping condition → treatment class", "Retrieving MED-RT verified drug candidates", "Ranking by clinical priority order", "Filtering for DDInter-verified drugs only"],
    icon: Database,
    imagePath: "/pipeline/step-medrt.svg",
    source: "MED-RT (FDA/VA) + DDInter 2.0",
    accentColor: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    id: "evaluating",
    label: "Agentic Drug Safety Loop",
    description: "Evaluating each candidate for drug interactions & molecular toxicity",
    agentAction: "Agent evaluating each drug candidate for safety",
    detail: "For each candidate, the agent: (1) checks DDInter 2.0 for drug-drug, food, and disease interactions against patient medications, (2) runs TxGemma-2B molecular toxicity prediction using PubChem SMILES strings across 6 safety endpoints. Unsafe drugs are rejected; the first safe drug is selected.",
    subSteps: ["Checking DDInter 2.0 drug-drug interactions", "Scraping food & disease contraindications", "Running TxGemma-2B on PubChem SMILES (6 endpoints)", "Evaluating: Skin Reaction, DILI, CYP2C9, CYP3A4, hERG, ClinTox", "Rejecting unsafe → selecting safest candidate"],
    icon: ShieldCheck,
    imagePath: "/pipeline/step-txgemma.svg",
    source: "DDInter 2.0 + google/txgemma-2b-predict + PubChem",
    accentColor: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  {
    id: "synthesizing",
    label: "MedGemma Clinical Synthesis",
    description: "Generating clinical report from all pipeline findings",
    agentAction: "MedGemma synthesizing clinical report & patient explanation",
    detail: "Google's MedGemma-4B receives the complete pipeline context — diagnosis, selected drug, all safety findings, rejected alternatives — and generates a structured clinical report with reasoning trace and plain-language patient explanation.",
    subSteps: ["Assembling full pipeline context", "Generating clinical summary & reasoning", "Writing patient-friendly explanation", "Compiling rejected alternatives with reasons"],
    icon: Sparkles,
    imagePath: "/pipeline/step-medgemma.svg",
    source: "google/medgemma-4b-it",
    accentColor: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
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

  const fileToBase64 = (f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  };

  /* ── Auto-load demo image when session.imagePath is set ── */
  useEffect(() => {
    if (session.imagePath && !file && !preview) {
      fetch(session.imagePath)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to fetch demo image: ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          const fileName =
            session.imagePath!.split("/").pop() || "demo-image.jpg";
          const demoFile = new File([blob], fileName, {
            type: blob.type || "image/jpeg",
          });
          setFile(demoFile);
          return fileToBase64(demoFile);
        })
        .then((base64) => setPreview(base64))
        .catch((err) => console.warn("Demo image auto-load failed:", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.imagePath]);

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

    const timers: ReturnType<typeof setTimeout>[] = [];

    try {
      // Stage-advance timers for the animation
      timers.push(setTimeout(() => setStage("classifying"), 1500));
      timers.push(setTimeout(() => setStage("candidates"), 4000));
      timers.push(setTimeout(() => setStage("evaluating"), 6000));
      timers.push(setTimeout(() => setStage("synthesizing"), 12000));

      // Fire the API call and a minimum-time promise in parallel.
      // This ensures the animation plays for at least ~14s even if the
      // backend responds instantly (mock mode).
      const minDuration = new Promise((r) => setTimeout(r, 14500));
      const [response] = await Promise.all([
        analyzeImage(file, medications),
        minDuration,
      ]);

      timers.forEach(clearTimeout);

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
      timers.forEach(clearTimeout);
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
            <h2 className="text-lg font-semibold tracking-tight">Agentic Diagnostic Pipeline</h2>
            <p className="text-sm text-muted-foreground">
              Step {currentIdx + 1} of {PIPELINE_STEPS.length} — {currentStep.agentAction}
            </p>
          </div>

          {/* Progress bar */}
          <div className="relative">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
                style={{ width: `${((currentIdx + 0.5) / PIPELINE_STEPS.length) * 100}%` }}
              />
            </div>
            {/* Step dots on progress bar */}
            <div className="absolute inset-0 flex items-center justify-between px-0">
              {PIPELINE_STEPS.map((step, i) => {
                const status = getStepStatus(step.id, stage);
                return (
                  <div
                    key={step.id}
                    className={`h-3 w-3 rounded-full border-2 transition-all duration-300 ${
                      status === "complete"
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

          {/* Step labels row */}
          <div className="grid grid-cols-5 gap-1 -mt-2">
            {PIPELINE_STEPS.map((step, i) => {
              const status = getStepStatus(step.id, stage);
              return (
                <div key={step.id} className="text-center">
                  <p className={`text-[9px] sm:text-[10px] font-medium leading-tight ${
                    status === "complete"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : status === "current"
                        ? "text-indigo-700 dark:text-indigo-300 font-semibold"
                        : "text-muted-foreground/40"
                  }`}>
                    {step.label.split(" ").slice(0, 2).join(" ")}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ═══ Active Step Card ═══ */}
          <div className={`rounded-2xl border-2 ${currentStep.borderColor} ${currentStep.bgColor} overflow-hidden animate-slide-in transition-all duration-500`} key={currentStep.id}>
            {/* Card header */}
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

            {/* Card body — image + details side by side */}
            <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-0">
              {/* Image placeholder */}
              <div className="bg-muted/30 flex items-center justify-center p-6 md:border-r border-border/30 min-h-[180px]">
                <img
                  src={currentStep.imagePath}
                  alt={currentStep.label}
                  className="max-h-40 max-w-full object-contain rounded-lg"
                  onError={(e) => {
                    // Fallback: show icon if image not found
                    const target = e.currentTarget;
                    target.style.display = "none";
                    target.parentElement?.classList.add("pipeline-img-fallback");
                  }}
                />
                {/* Fallback shown via CSS when image fails */}
                <div className="pipeline-img-placeholder hidden flex-col items-center gap-3 text-center">
                  <div className={`h-16 w-16 rounded-2xl ${currentStep.bgColor} border ${currentStep.borderColor} flex items-center justify-center`}>
                    <StepIcon className={`h-8 w-8 ${currentStep.accentColor} opacity-60`} />
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 max-w-[160px]">
                    Place your image at<br />
                    <code className="text-[9px] bg-muted px-1 py-0.5 rounded">{currentStep.imagePath}</code>
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="p-5 space-y-4">
                {/* What the agent is doing */}
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider ${currentStep.accentColor} mb-1.5`}>
                    What the agent is doing
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {currentStep.detail}
                  </p>
                </div>

                {/* Animated sub-steps */}
                <div className="space-y-1.5">
                  {currentStep.subSteps.map((sub, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 animate-slide-in"
                      style={{ animationDelay: `${i * 0.3}s` }}
                    >
                      <ArrowRight className={`h-3 w-3 ${currentStep.accentColor} shrink-0 animate-pulse-dot`}
                        style={{ animationDelay: `${i * 0.5}s` }}
                      />
                      <span className="text-xs text-muted-foreground">{sub}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ═══ Completed Steps Summary ═══ */}
          {currentIdx > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Completed Steps</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PIPELINE_STEPS.slice(0, currentIdx).map((step) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.id}
                      className="flex items-center gap-2.5 rounded-lg border border-emerald-200/50 dark:border-emerald-800/30 bg-emerald-50/30 dark:bg-emerald-900/5 px-3 py-2"
                    >
                      <div className="h-6 w-6 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 truncate">{step.label}</p>
                        <p className="text-[10px] text-emerald-600/60 dark:text-emerald-400/50 truncate">{step.source}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ Pending Steps ═══ */}
          {currentIdx < PIPELINE_STEPS.length - 1 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Next Steps</p>
              <div className="flex flex-wrap gap-2">
                {PIPELINE_STEPS.slice(currentIdx + 1).map((step) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.id}
                      className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/10 px-3 py-1.5"
                    >
                      <Icon className="h-3.5 w-3.5 text-muted-foreground/30" />
                      <span className="text-[11px] text-muted-foreground/40">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Patient / image context */}
          <div className="flex items-center justify-center gap-4 pt-2">
            {preview && (
              <img
                src={preview}
                alt="Analyzing"
                className="h-12 w-12 rounded-lg object-cover opacity-50 ring-1 ring-border"
              />
            )}
            {medications.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Pill className="h-3.5 w-3.5 text-muted-foreground/40" />
                <span className="text-[10px] text-muted-foreground/40 capitalize">
                  {medications.slice(0, 3).join(", ")}{medications.length > 3 ? ` +${medications.length - 3} more` : ""}
                </span>
              </div>
            )}
          </div>
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
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-base sm:text-lg font-semibold">Analysis Results</h2>
        </div>

        {/* Classification Section */}
        {result.classification && (
          <div className="animate-slide-in space-y-4">
            {/* Image + Diagnosis Card */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className={`${preview ? "grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[220px_1fr]" : ""}`}>
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
                  <div className="p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">
                          Diagnosis
                        </p>
                        <h3 className="text-xl font-bold capitalize text-foreground leading-tight">
                          {result.classification.display_name}
                        </h3>
                        {result.classification.treatment_class && (
                          <div className="mt-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/60 border border-border/60 rounded-md px-2 py-1 capitalize">
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
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Diagnostic Confidence
                          </span>
                        </div>
                        <Badge className={`text-[10px] px-2 py-0.5 ${getConfidenceBadgeColor(result.classification.confidence_level)}`}>
                          {result.classification.confidence_level === "HIGH" ? "Strong Match"
                            : result.classification.confidence_level === "MODERATE" ? "Moderate Match"
                            : "Low Match"}
                        </Badge>
                      </div>
                      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${getConfidenceColor(result.classification.confidence_level)}`}
                          style={{
                            width: `${
                              result.classification.confidence_level === "HIGH" ? 85
                                : result.classification.confidence_level === "MODERATE" ? 55
                                : 25
                            }%`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground/70">
                        {result.classification.confidence_level === "HIGH"
                          ? "High confidence in this diagnosis — proceeding with treatment evaluation."
                          : result.classification.confidence_level === "MODERATE"
                          ? "Moderate confidence — clinical correlation recommended."
                          : "Low confidence — specialist evaluation suggested."}
                      </p>
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
                    {(() => {
                      const sorted = (result.classification!.top_scores as TopScore[])
                        .filter((s) => s.score > 0)
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 5);
                      const maxScore = sorted[0]?.score || 1;
                      return sorted.map((entry, index) => {
                        const normalizedPct = Math.round((entry.score / maxScore) * 100);
                        const isTop = index === 0;
                        return (
                          <div
                            key={entry.category}
                            className={`flex items-center gap-2 sm:gap-3 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 ${
                              isTop
                                ? "bg-muted/40 border border-border/50"
                                : ""
                            }`}
                          >
                            <span className="text-[11px] font-bold tabular-nums text-muted-foreground/40 w-5 text-right shrink-0">
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
                                  {isTop && (
                                    <Badge className="bg-muted text-muted-foreground text-[9px] px-1.5 py-0">
                                      Top Match
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 ml-2">
                                  <span
                                    className={`text-sm font-mono tabular-nums ${
                                      isTop
                                        ? "font-bold text-foreground"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {normalizedPct}%
                                  </span>
                                </div>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${
                                    isTop ? "bg-foreground/70" : "bg-foreground/15"
                                  }`}
                                  style={{ width: `${normalizedPct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 mt-2">
                    Relative match strength across differential diagnoses. Top prediction normalized to 100%.
                  </p>
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

        {/* ========== TIER 1 — DRUG EVALUATION ========== */}
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
          </>
        )}

        {/* ========== CLINICAL REPORT (ALL TIERS) ========== */}
        {result.report && (
          <Card
            className="animate-slide-in overflow-hidden"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="px-4 sm:px-6 pt-1 pb-4 sm:pb-6 space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold tracking-tight">
                  Clinical Report
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => exportClinicalReportPDF(result, patient, preview)}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Download PDF</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
                  Summary
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {result.report.clinical_summary}
                </p>
              </div>

              <div className={`border-l-[3px] pl-4 py-1 ${
                isTier1 ? "border-emerald-500" : isTier2 ? "border-amber-500" : "border-red-500"
              }`}>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
                  {isTier1 ? "Recommended Treatment" : "Recommendation"}
                </p>
                {isTier1 && result.report.drug_name && result.report.drug_name !== "none" && (
                  <p className="text-base font-semibold capitalize text-foreground">
                    {result.report.drug_name}
                  </p>
                )}
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
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg space-y-4 sm:space-y-6">
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
              ? "border-border bg-muted/30 p-6"
              : "border-muted-foreground/20 hover:border-foreground/30 hover:bg-muted/20 p-0"
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
                <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center shadow-sm">
                  <Upload className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    Upload Skin Image
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Drag & drop or{" "}
                    <span className="text-foreground font-medium">
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
          <div className="bg-muted/40 border border-border rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Pill className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs font-medium text-foreground">
                  {patient.name}&apos;s Medications ({medications.length})
                </p>
                <p className="text-xs text-muted-foreground capitalize">
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
          className="w-full bg-foreground hover:bg-foreground/90 text-background"
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
