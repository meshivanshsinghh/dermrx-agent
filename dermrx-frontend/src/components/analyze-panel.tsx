"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ImageIcon,
  Pill,
  Brain,
  FileText,
  Shield,
  ChevronDown,
  ChevronUp,
  Circle,
  Play,
  Check,
  Info,
} from "lucide-react";
import {
  analyzeImage,
  AnalyzeResponse,
  CandidateEvaluation,
  PatientSession,
  saveSession,
} from "@/lib/api";

interface AnalyzePanelProps {
  session: PatientSession;
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
  onSessionUpdate,
}: AnalyzePanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    session.imagePreview || null,
  );
  const [medications, setMedications] = useState<string[]>([]);
  const [medInput, setMedInput] = useState("");
  const [stage, setStage] = useState<PipelineStage>(
    session.result ? "complete" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(
    session.result as AnalyzeResponse | null,
  );
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(
    null,
  );

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const addMedication = () => {
    const trimmed = medInput.trim();
    if (trimmed && !medications.includes(trimmed)) {
      setMedications([...medications, trimmed]);
      setMedInput("");
    }
  };

  const removeMedication = (med: string) => {
    setMedications(medications.filter((m) => m !== med));
  };

  const loadDemoMedications = () => {
    setMedications(["warfarin", "metformin", "lisinopril"]);
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

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "major":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "moderate":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "minor":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SAFE":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "CAUTION":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SAFE":
        return "border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400";
      case "CAUTION":
        return "border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400";
      case "REJECTED":
        return "border-red-300 text-red-600 dark:border-red-700 dark:text-red-400";
      default:
        return "";
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
              setMedications([]);
              setStage("idle");
              setExpandedCandidate(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            New Analysis
          </Button>
        </div>

        {/* Classification Card */}
        {result.classification && (
          <Card className="animate-slide-in">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-base">Classification</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold capitalize">
                    {result.classification.display_name}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {result.classification.treatment_class}
                  </p>
                </div>
                {getTierBadge(result.classification.tier)}
              </div>

              {/* Confidence Visual Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {formatScore(result.classification.confidence)}
                    </span>
                    <Badge
                      className={`text-xs ${getConfidenceBadgeColor(result.classification.confidence_level)}`}
                    >
                      {result.classification.confidence_level}
                    </Badge>
                  </div>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${getConfidenceColor(result.classification.confidence_level)}`}
                    style={{
                      width: `${Math.min(
                        (result.classification.confidence || 0) * 100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {result.classification.safety_flags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {result.classification.safety_flags.map((flag) => (
                    <Badge key={flag} variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {flag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Top Scores — FIXED */}
              {result.classification.top_scores && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Top Predictions
                  </p>
                  {Object.entries(result.classification.top_scores)
                    .filter(
                      ([, score]) =>
                        score !== null &&
                        score !== undefined &&
                        !isNaN(Number(score)),
                    )
                    .sort(([, a], [, b]) => Number(b) - Number(a))
                    .slice(0, 5)
                    .map(([name, score]) => (
                      <div key={name} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="capitalize truncate font-medium">
                              {name}
                            </span>
                            <span className="text-muted-foreground font-mono">
                              {formatScore(score)}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo-500/70 transition-all duration-700"
                              style={{
                                width: `${Math.min(Number(score) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Image preview */}
              {preview && (
                <div className="mt-3">
                  <img
                    src={preview}
                    alt="Uploaded skin image"
                    className="rounded-lg max-h-48 object-cover"
                  />
                </div>
              )}
            </CardContent>
          </Card>
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
                      {result.classification.safety_flags.map((flag) => (
                        <Badge
                          key={flag}
                          className="bg-amber-100 text-amber-700 text-xs"
                        >
                          {flag}
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
                      {result.classification.safety_flags.map((flag) => (
                        <Badge
                          key={flag}
                          variant="destructive"
                          className="text-xs"
                        >
                          {flag}
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

            {/* Agentic Drug Evaluation Trail */}
            {result.candidates_evaluated.length > 0 && (
              <Card
                className="animate-slide-in"
                style={{ animationDelay: "0.1s" }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-amber-500" />
                    <CardTitle className="text-base">
                      Agentic Drug Evaluation
                    </CardTitle>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {result.candidates_evaluated.length} candidates evaluated
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.candidates_evaluated.map(
                    (candidate: CandidateEvaluation) => (
                      <div
                        key={candidate.drug_name}
                        className={`rounded-lg border p-3 transition-all ${
                          candidate.drug_name === result.selected_drug
                            ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10 ring-2 ring-emerald-200 dark:ring-emerald-900"
                            : candidate.status === "REJECTED"
                              ? "border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-900/5"
                              : "border-border"
                        }`}
                      >
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() =>
                            setExpandedCandidate(
                              expandedCandidate === candidate.drug_name
                                ? null
                                : candidate.drug_name,
                            )
                          }
                        >
                          <div className="flex items-center gap-2">
                            {getStatusIcon(candidate.status)}
                            <span className="font-medium text-sm capitalize">
                              {candidate.drug_name}
                            </span>
                            {candidate.drug_name === result.selected_drug && (
                              <Badge className="bg-emerald-100 text-emerald-700 text-[10px] dark:bg-emerald-900/30 dark:text-emerald-400">
                                ✓ SELECTED
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${getStatusColor(candidate.status)}`}
                            >
                              {candidate.status}
                            </Badge>
                            {expandedCandidate === candidate.drug_name ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1">
                          {candidate.reason}
                        </p>

                        {expandedCandidate === candidate.drug_name &&
                          candidate.findings.length > 0 && (
                            <div className="mt-3 space-y-2.5 pl-6 border-l-2 border-muted">
                              {candidate.findings.map((finding, i) => (
                                <div key={i} className="text-xs space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <Badge
                                      className={`text-[10px] ${getSeverityColor(
                                        finding.severity,
                                      )}`}
                                    >
                                      {finding.severity}
                                    </Badge>
                                    <span className="font-medium uppercase text-[10px] tracking-wide">
                                      {finding.finding_type}
                                    </span>
                                  </div>
                                  <p className="text-muted-foreground">
                                    {finding.description}
                                  </p>
                                  {finding.action && (
                                    <p className="text-indigo-600 dark:text-indigo-400 font-medium">
                                      → {finding.action}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    ),
                  )}
                </CardContent>
              </Card>
            )}

            {/* Clinical Report */}
            {result.report && (
              <Card
                className="animate-slide-in"
                style={{ animationDelay: "0.2s" }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-base">Clinical Report</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">
                      Clinical Summary
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {result.report.clinical_summary}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-semibold mb-1">
                      Recommended Treatment
                    </h4>
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="h-4 w-4 text-emerald-500" />
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                        {result.report.drug_name}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {result.report.recommended_treatment}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-semibold mb-1">
                      Reasoning Trace
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 rounded-lg p-3 text-xs leading-relaxed">
                      {result.report.reasoning_trace}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-semibold mb-1">
                      Patient Explanation
                    </h4>
                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm whitespace-pre-wrap">
                        {result.report.patient_explanation}
                      </p>
                    </div>
                  </div>

                  {result.report.rejected_drugs &&
                    result.report.rejected_drugs.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                            <XCircle className="h-4 w-4 text-red-500" />
                            Drugs Avoided
                          </h4>
                          <div className="space-y-2">
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
                                    className="border-l-4 border-red-400 dark:border-red-600 bg-red-50/50 dark:bg-red-900/10 rounded-r-lg p-3"
                                  >
                                    <div className="flex items-center gap-2">
                                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                                      <span className="font-medium text-sm capitalize text-red-700 dark:text-red-400">
                                        {drugName}
                                      </span>
                                      {candidate && (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] border-red-300 text-red-600"
                                        >
                                          {candidate.status}
                                        </Badge>
                                      )}
                                    </div>
                                    {rejectionReason && (
                                      <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1 pl-5">
                                        {rejectionReason}
                                      </p>
                                    )}
                                    {!rejectionReason && candidate && (
                                      <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1 pl-5">
                                        {candidate.reason}
                                      </p>
                                    )}
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      </>
                    )}
                </CardContent>
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
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            preview
              ? "border-indigo-300 bg-indigo-50/50 dark:border-indigo-700 dark:bg-indigo-900/10"
              : "border-muted-foreground/20 hover:border-indigo-300 hover:bg-indigo-50/30"
          }`}
        >
          {preview ? (
            <div className="space-y-3">
              <img
                src={preview}
                alt="Preview"
                className="max-h-48 rounded-lg mx-auto object-cover"
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
            <label className="cursor-pointer space-y-3 block">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Drop skin image here or{" "}
                  <span className="text-indigo-600 dark:text-indigo-400">
                    browse
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG up to 10MB
                </p>
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

        {/* Medications */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Patient Medications{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={medInput}
              onChange={(e) => setMedInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMedication()}
              placeholder="e.g. Warfarin, Metformin..."
              className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button variant="outline" size="sm" onClick={addMedication}>
              Add
            </Button>
          </div>
          {medications.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {medications.map((med) => (
                <Badge
                  key={med}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-destructive/10 capitalize"
                  onClick={() => removeMedication(med)}
                >
                  {med}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}

          {/* Demo Quick-Fill */}
          {medications.length === 0 && (
            <button
              onClick={loadDemoMedications}
              className="flex items-center gap-2 text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors mt-1"
            >
              <Pill className="h-3 w-3" />
              <span>
                Try demo: Patient on <strong>warfarin</strong>,{" "}
                <strong>metformin</strong>, <strong>lisinopril</strong>
              </span>
            </button>
          )}
        </div>

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
