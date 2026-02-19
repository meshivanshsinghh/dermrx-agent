"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Stethoscope,
  Check,
  Circle,
  Play,
  Loader2,
  FlaskConical,
  Brain,
  Eye,
  Database,
  Server,
} from "lucide-react";
import { checkHealth } from "@/lib/api";

interface StartupLoaderProps {
  onReady: (mockMode: boolean) => void;
}

interface LoadingStep {
  id: string;
  label: string;
  description: string;
  icon: typeof Server;
  mockDelay: number; // ms delay for mock mode simulation
}

const LOADING_STEPS: LoadingStep[] = [
  {
    id: "server",
    label: "Connecting to Backend",
    description: "Establishing API connection...",
    icon: Server,
    mockDelay: 600,
  },
  {
    id: "database",
    label: "Loading Drug Database",
    description: "1,867 drugs from DDInter 2.0 & 170 verified treatments",
    icon: Database,
    mockDelay: 800,
  },
  {
    id: "medsiglip",
    label: "MedSigLIP Classifier",
    description: "Zero-shot dermatology classification (22 conditions, 76 prompts)",
    icon: Eye,
    mockDelay: 1200,
  },
  {
    id: "txgemma",
    label: "TxGemma Molecular Analyzer",
    description: "Drug toxicity & CYP interaction prediction engine",
    icon: FlaskConical,
    mockDelay: 1000,
  },
  {
    id: "medgemma",
    label: "MedGemma Clinical Synthesizer",
    description: "Clinical report generation & patient explanation",
    icon: Brain,
    mockDelay: 1000,
  },
];

type StepStatus = "pending" | "current" | "complete";

export default function StartupLoader({ onReady }: StartupLoaderProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const getStepStatus = useCallback(
    (index: number): StepStatus => {
      if (completed) return "complete";
      if (index < currentStepIndex) return "complete";
      if (index === currentStepIndex) return "current";
      return "pending";
    },
    [currentStepIndex, completed],
  );

  // Main loading logic
  useEffect(() => {
    let cancelled = false;

    async function runStartup() {
      // Step 0: Connect to backend
      setCurrentStepIndex(0);
      let healthData;

      try {
        healthData = await checkHealth();
      } catch {
        // Backend not running — retry a few times
        if (retryCount < 3) {
          await new Promise((r) => setTimeout(r, 2000));
          if (!cancelled) setRetryCount((c) => c + 1);
          return;
        }
        setError(
          "Cannot connect to the DermRx backend. Make sure the server is running on port 8000.",
        );
        return;
      }

      if (cancelled) return;

      const mockMode = healthData.mock_mode;
      setIsMock(mockMode);

      if (mockMode) {
        // Mock mode: Animate through steps with deliberate delays
        for (let i = 0; i < LOADING_STEPS.length; i++) {
          if (cancelled) return;
          setCurrentStepIndex(i);
          await new Promise((r) => setTimeout(r, LOADING_STEPS[i].mockDelay));
        }
      } else {
        // Real mode: Poll health until all models loaded
        setCurrentStepIndex(1); // database
        await new Promise((r) => setTimeout(r, 500));

        // Wait for models
        const modelKeys = ["medsiglip", "txgemma", "medgemma"];
        const stepMap: Record<string, number> = {
          medsiglip: 2,
          txgemma: 3,
          medgemma: 4,
        };

        let allLoaded = false;
        while (!allLoaded && !cancelled) {
          try {
            const status = await checkHealth();
            const loaded = status.models_loaded || {};

            // Advance to the step of the first model that's still loading
            let highestLoaded = 1; // database always loads first
            for (const key of modelKeys) {
              if (loaded[key]) {
                highestLoaded = Math.max(
                  highestLoaded,
                  stepMap[key],
                );
              }
            }
            setCurrentStepIndex(highestLoaded);
            allLoaded = modelKeys.every((k) => loaded[k]);
          } catch {
            // Retry silently
          }
          if (!allLoaded) {
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
      }

      if (cancelled) return;

      // All done
      setCurrentStepIndex(LOADING_STEPS.length);
      setCompleted(true);

      // Brief pause to show all-green, then fade out
      await new Promise((r) => setTimeout(r, 600));
      if (cancelled) return;
      setFadeOut(true);
      await new Promise((r) => setTimeout(r, 500));
      if (!cancelled) onReady(mockMode);
    }

    runStartup();
    return () => {
      cancelled = true;
    };
  }, [retryCount, onReady]);

  const progress = completed
    ? 100
    : Math.round((currentStepIndex / LOADING_STEPS.length) * 100);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Subtle animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-100/40 via-transparent to-transparent dark:from-indigo-900/20 animate-slow-spin" />
      </div>

      <div className="relative w-full max-w-md px-8 space-y-8">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="relative mx-auto w-fit">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/20">
              <Stethoscope className="h-10 w-10 text-white" />
            </div>
            {!completed && (
              <div className="absolute -right-1 -bottom-1 h-6 w-6 rounded-full bg-background border-2 border-indigo-500 flex items-center justify-center">
                <Loader2 className="h-3.5 w-3.5 text-indigo-500 animate-spin" />
              </div>
            )}
            {completed && (
              <div className="absolute -right-1 -bottom-1 h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold">DermRx Agent</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI-Powered Dermatology Decision Support
            </p>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center space-y-2">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setRetryCount(0);
              }}
              className="text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 underline"
            >
              Retry connection
            </button>
          </div>
        )}

        {/* Steps */}
        {!error && (
          <div className="space-y-1">
            {LOADING_STEPS.map((step, i) => {
              const status = getStepStatus(i);
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-500 ${
                    status === "current"
                      ? "bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800"
                      : status === "complete"
                        ? "bg-emerald-50/50 dark:bg-emerald-900/5"
                        : ""
                  }`}
                  style={{
                    opacity: status === "pending" ? 0.4 : 1,
                    transform: status === "pending" ? "translateX(4px)" : "translateX(0)",
                    transition: "all 0.4s ease-out",
                  }}
                >
                  <div className="mt-0.5 shrink-0">
                    {status === "complete" ? (
                      <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                    ) : status === "current" ? (
                      <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center animate-pulse shadow-sm shadow-indigo-500/30">
                        <Play className="h-3 w-3 text-white fill-white" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-slate-200 dark:border-slate-700">
                        <Circle className="h-full w-full text-transparent" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`h-3.5 w-3.5 ${
                          status === "complete"
                            ? "text-emerald-500"
                            : status === "current"
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-muted-foreground/40"
                        }`}
                      />
                      <p
                        className={`text-sm font-medium ${
                          status === "complete"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : status === "current"
                              ? "text-indigo-700 dark:text-indigo-300"
                              : "text-muted-foreground/50"
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                    {status === "current" && (
                      <p className="text-[11px] text-indigo-500 dark:text-indigo-400 mt-0.5 ml-5.5 animate-pulse">
                        {step.description}
                      </p>
                    )}
                  </div>
                  {status === "current" && (
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500 mt-1 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Progress bar */}
        {!error && (
          <div className="space-y-2">
            <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">
                {completed
                  ? "All systems ready"
                  : `Loading ${LOADING_STEPS[Math.min(currentStepIndex, LOADING_STEPS.length - 1)]?.label.toLowerCase()}...`}
              </p>
              {isMock && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
                  Mock Mode
                </span>
              )}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[9px] text-center text-muted-foreground/50">
          Research demonstration for MedGemma Impact Challenge · Not for clinical use
        </p>
      </div>
    </div>
  );
}
