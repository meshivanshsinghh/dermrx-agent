"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
  | "evaluating"
  | "synthesizing"
  | "complete"
  | "error";

const STAGE_LABELS: Record<PipelineStage, string> = {
  idle: "Ready",
  uploading: "Uploading image...",
  classifying: "MedSigLIP classifying skin condition...",
  evaluating: "Agentic DDI safety loop running...",
  synthesizing: "MedGemma synthesizing report...",
  complete: "Analysis complete",
  error: "Error occurred",
};

const STAGE_PROGRESS: Record<PipelineStage, number> = {
  idle: 0,
  uploading: 10,
  classifying: 30,
  evaluating: 60,
  synthesizing: 85,
  complete: 100,
  error: 0,
};

export default function AnalyzePanel({
  session,
  onSessionUpdate,
}: AnalyzePanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    session.imagePreview || null
  );
  const [medications, setMedications] = useState<string[]>([]);
  const [medInput, setMedInput] = useState("");
  const [stage, setStage] = useState<PipelineStage>(
    session.result ? "complete" : "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(
    session.result as AnalyzeResponse | null
  );
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(
    null
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

  const handleAnalyze = async () => {
    if (!file) return;

    setError(null);
    setStage("uploading");

    try {
      // Simulate stage progression (the backend does it all in one call)
      setStage("classifying");

      const timer1 = setTimeout(() => setStage("evaluating"), 3000);
      const timer2 = setTimeout(() => setStage("synthesizing"), 8000);

      const response = await analyzeImage(file, medications);

      clearTimeout(timer1);
      clearTimeout(timer2);

      setResult(response);
      setStage("complete");

      // Update session
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

  // If we already have a result, show it
  if (result && stage === "complete") {
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
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold">
                    {result.classification.display_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {result.classification.treatment_class}
                  </p>
                </div>
                {getTierBadge(result.classification.tier)}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Confidence</span>
                    <span className="font-medium">
                      {(result.classification.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={result.classification.confidence * 100}
                    className="h-2"
                  />
                </div>
                <Badge variant="outline" className="text-xs">
                  {result.classification.confidence_level}
                </Badge>
              </div>

              {result.classification.safety_flags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {result.classification.safety_flags.map((flag) => (
                    <Badge
                      key={flag}
                      variant="destructive"
                      className="text-xs"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {flag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Top Scores */}
              {result.classification.top_scores && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Top Predictions
                  </p>
                  {Object.entries(result.classification.top_scores)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([name, score]) => (
                      <div key={name} className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs">
                            <span className="truncate">{name}</span>
                            <span>{(score * 100).toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo-500/70"
                              style={{ width: `${score * 100}%` }}
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

        {/* Agentic Drug Evaluation Trail */}
        {result.candidates_evaluated.length > 0 && (
          <Card className="animate-slide-in" style={{ animationDelay: "0.1s" }}>
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
                    className={`rounded-lg border p-3 transition-colors ${
                      candidate.drug_name === result.selected_drug
                        ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10"
                        : "border-border"
                    }`}
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() =>
                        setExpandedCandidate(
                          expandedCandidate === candidate.drug_name
                            ? null
                            : candidate.drug_name
                        )
                      }
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(candidate.status)}
                        <span className="font-medium text-sm">
                          {candidate.drug_name}
                        </span>
                        {candidate.drug_name === result.selected_drug && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                            SELECTED
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            candidate.status === "SAFE"
                              ? "border-emerald-300 text-emerald-600"
                              : candidate.status === "CAUTION"
                              ? "border-amber-300 text-amber-600"
                              : "border-red-300 text-red-600"
                          }`}
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
                        <div className="mt-3 space-y-2 pl-6 border-l-2 border-muted">
                          {candidate.findings.map((finding, i) => (
                            <div key={i} className="text-xs space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  className={`text-[10px] ${getSeverityColor(
                                    finding.severity
                                  )}`}
                                >
                                  {finding.severity}
                                </Badge>
                                <span className="font-medium">
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
                )
              )}
            </CardContent>
          </Card>
        )}

        {/* Report */}
        {result.report && (
          <Card className="animate-slide-in" style={{ animationDelay: "0.2s" }}>
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
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
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
                <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 rounded-lg p-3">
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

              {result.report.rejected_drugs.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      Rejected Drugs
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {result.report.rejected_drugs.map((drug) => (
                        <Badge
                          key={drug}
                          variant="outline"
                          className="text-xs border-red-200 text-red-600"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          {drug}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
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

  // Input form
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* Pipeline Progress */}
        {stage !== "idle" && stage !== "complete" && (
          <Card className="border-indigo-200 dark:border-indigo-800">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{STAGE_LABELS[stage]}</p>
                  <Progress
                    value={STAGE_PROGRESS[stage]}
                    className="h-1.5 mt-1.5"
                  />
                </div>
              </div>

              {/* Stage dots */}
              <div className="flex justify-between px-2">
                {(
                  ["classifying", "evaluating", "synthesizing"] as const
                ).map((s, i) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        STAGE_PROGRESS[stage] >= STAGE_PROGRESS[s]
                          ? "bg-indigo-500"
                          : "bg-muted animate-pulse-dot"
                      }`}
                      style={{ animationDelay: `${i * 0.3}s` }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {s === "classifying"
                        ? "Classify"
                        : s === "evaluating"
                        ? "DDI Check"
                        : "Report"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                  className="text-xs cursor-pointer hover:bg-destructive/10"
                  onClick={() => removeMedication(med)}
                >
                  {med}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Analyze Button */}
        <Button
          onClick={handleAnalyze}
          disabled={!file || stage !== "idle"}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          size="lg"
        >
          {stage !== "idle" && stage !== "error" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Analyze Skin Image
        </Button>

        <p className="text-[10px] text-center text-muted-foreground">
          For clinical decision support only. Not a substitute for
          professional medical diagnosis.
        </p>
      </div>
    </div>
  );
}