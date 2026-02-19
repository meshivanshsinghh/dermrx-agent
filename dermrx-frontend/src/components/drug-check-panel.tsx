"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Pill,
  Shield,
  Search,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { drugCheck, searchDrugs } from "@/lib/api";
import {
  DrugCheckResponse,
  CandidateEvaluation,
  Patient,
  PatientSession,
} from "@/lib/type";
import { saveSession } from "@/lib/storage";

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
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DrugCheckResponse | null>(
    session.result as DrugCheckResponse | null
  );
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
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
    setLoading(true);

    try {
      const response = await drugCheck(drugNames, medications);
      setResult(response);

      const updatedSession: PatientSession = {
        ...session,
        name: `Drug Check: ${drugNames.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")}`,
        result: response,
      };
      onSessionUpdate(updatedSession);
      saveSession(updatedSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Drug check failed");
    } finally {
      setLoading(false);
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

  if (result) {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Drug Safety Results</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setResult(null);
              setDrugNames([]);
              setExpandedCandidate(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            New Check
          </Button>
        </div>

        {result.candidates_evaluated.length > 0 && (
          <Card className="animate-slide-in">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base">Safety Evaluation</CardTitle>
                <Badge variant="outline" className="text-xs ml-auto">
                  {result.candidates_evaluated.length} drugs checked
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.candidates_evaluated.map(
                (candidate: CandidateEvaluation) => (
                  <div
                    key={candidate.drug_name}
                    className={`rounded-lg border p-3 transition-all ${
                      candidate.status === "REJECTED"
                        ? "border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-900/5"
                        : candidate.status === "CAUTION"
                        ? "border-amber-200 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-900/5"
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
                        <span className="font-medium text-sm capitalize">
                          {candidate.drug_name}
                        </span>
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
                            <div key={i} className="text-xs space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge
                                  className={`text-[10px] ${getSeverityColor(
                                    finding.severity
                                  )}`}
                                >
                                  {finding.severity}
                                </Badge>
                                <span className="font-medium uppercase text-[10px] tracking-wide">
                                  {finding.finding_type}
                                </span>
                                {finding.mechanism && (
                                  <span className="text-[10px] text-muted-foreground italic">
                                    ({finding.mechanism})
                                  </span>
                                )}
                              </div>
                              <p className="text-muted-foreground">
                                {finding.description}
                              </p>
                              {finding.management && (
                                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded px-2 py-1.5">
                                  <p className="text-blue-700 dark:text-blue-400 font-medium text-[10px] uppercase tracking-wide mb-0.5">Management</p>
                                  <p className="text-blue-600 dark:text-blue-300">
                                    {finding.management}
                                  </p>
                                </div>
                              )}
                              {finding.action && !finding.management && (
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
        <div className="text-center space-y-1">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
            <Pill className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold">Drug Safety Check</h2>
          <p className="text-sm text-muted-foreground">
            Check drug interactions against {patient.name}&apos;s medications
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
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