"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Utensils,
  HeartPulse,
  FlaskConical,
  ArrowLeftRight,
  ShieldAlert,
  Shield,
  ShieldCheck,
  ShieldBan,
} from "lucide-react";
import { CandidateEvaluation, DDIFinding } from "@/lib/type";

/* ─────────────────────────────────────────────
   Classification & Style Helpers
   ───────────────────────────────────────────── */

type FindingCategory = "ddi" | "food" | "disease" | "toxicity" | "other";
type SeverityFilter = "all" | "major" | "moderate" | "minor";

function classifyFinding(f: DDIFinding): FindingCategory {
  const t = f.finding_type.toUpperCase();
  if (t.startsWith("FOOD")) return "food";
  if (t.startsWith("DISEASE")) return "disease";
  if (t === "TOXICITY" || t.startsWith("TOX")) return "toxicity";
  if (t.startsWith("DDI")) return "ddi";
  return "other";
}

const CATEGORY_META: Record<
  FindingCategory,
  {
    label: string;
    icon: typeof Shield;
    accent: string;
    bgAccent: string;
    borderAccent: string;
    iconBg: string;
  }
> = {
  ddi: {
    label: "Drug Interactions",
    icon: ArrowLeftRight,
    accent: "text-rose-600 dark:text-rose-400",
    bgAccent: "bg-rose-50/60 dark:bg-rose-950/10",
    borderAccent: "border-rose-200/70 dark:border-rose-800/30",
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
  },
  food: {
    label: "Food Interactions",
    icon: Utensils,
    accent: "text-orange-600 dark:text-orange-400",
    bgAccent: "bg-orange-50/60 dark:bg-orange-950/10",
    borderAccent: "border-orange-200/70 dark:border-orange-800/30",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
  },
  disease: {
    label: "Disease Contraindications",
    icon: HeartPulse,
    accent: "text-violet-600 dark:text-violet-400",
    bgAccent: "bg-violet-50/60 dark:bg-violet-950/10",
    borderAccent: "border-violet-200/70 dark:border-violet-800/30",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
  },
  toxicity: {
    label: "Molecular Flags",
    icon: FlaskConical,
    accent: "text-sky-600 dark:text-sky-400",
    bgAccent: "bg-sky-50/60 dark:bg-sky-950/10",
    borderAccent: "border-sky-200/70 dark:border-sky-800/30",
    iconBg: "bg-sky-100 dark:bg-sky-900/30",
  },
  other: {
    label: "Other",
    icon: ShieldAlert,
    accent: "text-slate-600 dark:text-slate-400",
    bgAccent: "bg-slate-50/60 dark:bg-slate-950/10",
    borderAccent: "border-slate-200/70 dark:border-slate-800/30",
    iconBg: "bg-slate-100 dark:bg-slate-900/30",
  },
};

const CAT_ORDER: FindingCategory[] = [
  "ddi",
  "food",
  "disease",
  "toxicity",
  "other",
];

/* ─── Severity Badge ─── */

function SeverityBadge({ severity }: { severity: string }) {
  const s = severity?.toLowerCase();
  const styles =
    s === "major"
      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50"
      : s === "moderate"
        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50"
        : s === "minor"
          ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/50"
          : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shrink-0 ${styles}`}
    >
      {severity || "Flag"}
    </span>
  );
}

/* ─── Status Helpers ─── */

function statusBorder(status: string) {
  switch (status) {
    case "REJECTED":
      return "border-l-red-500";
    case "CAUTION":
      return "border-l-amber-400";
    case "SAFE":
      return "border-l-emerald-500";
    default:
      return "border-l-slate-300";
  }
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    REJECTED: {
      bg: "bg-red-50 dark:bg-red-950/30",
      text: "text-red-700 dark:text-red-400",
      border: "border-red-200 dark:border-red-800/50",
      icon: ShieldBan,
    },
    CAUTION: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      text: "text-amber-700 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800/50",
      icon: ShieldAlert,
    },
    SAFE: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      text: "text-emerald-700 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800/50",
      icon: ShieldCheck,
    },
  }[status] || {
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
    icon: Shield,
  };

  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${config.bg} ${config.text} ${config.border}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Finding Card — individual warning/finding (within substance group)
   ───────────────────────────────────────────── */

function FindingCard({ finding }: { finding: DDIFinding }) {
  const [expanded, setExpanded] = useState(false);
  const TEXT_LIMIT = 180;
  const descParts = finding.description?.split(" — ") || [];
  // Show just the interaction detail, not the substance name (already in header)
  const detail = descParts.length > 1 ? descParts.slice(1).join(" — ") : finding.description;
  const descriptionLong = (detail?.length || 0) > TEXT_LIMIT;
  const displayDescription =
    descriptionLong && !expanded
      ? detail.slice(0, TEXT_LIMIT) + "..."
      : detail;

  return (
    <div className="rounded-lg bg-muted/30 px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground/80">
      <p>
        {displayDescription}
        {descriptionLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 text-[13px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors"
          >
            {expanded ? "Show Less" : "Read More"}
          </button>
        )}
      </p>
      {finding.mechanism && (
        <p className="text-xs text-muted-foreground/60 italic mt-1">
          {finding.mechanism}
        </p>
      )}
      {finding.management && (
        <p className="text-xs text-muted-foreground/70 mt-1.5 border-l-2 border-indigo-200 dark:border-indigo-800 pl-2.5 py-0.5">
          {finding.management}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Substance Group — groups findings by substance name
   ───────────────────────────────────────────── */

const SEVERITY_ORDER: Record<string, number> = { major: 0, moderate: 1, minor: 2 };

function getSubstanceName(description: string): string {
  // Extract substance name from "substance — details" format
  const parts = description.split(" — ");
  return parts[0]?.trim() || description;
}

function getHighestSeverity(findings: DDIFinding[]): string {
  let highest = "minor";
  for (const f of findings) {
    const s = f.severity?.toLowerCase() || "minor";
    if ((SEVERITY_ORDER[s] ?? 2) < (SEVERITY_ORDER[highest] ?? 2)) {
      highest = s;
    }
  }
  return highest;
}

function SubstanceGroup({
  substanceName,
  findings,
}: {
  substanceName: string;
  findings: DDIFinding[];
}) {
  const [open, setOpen] = useState(false);
  const highest = getHighestSeverity(findings);

  const borderColor =
    highest === "major"
      ? "border-l-red-400 dark:border-l-red-500"
      : highest === "moderate"
        ? "border-l-amber-400 dark:border-l-amber-500"
        : "border-l-slate-300 dark:border-l-slate-600";

  return (
    <div
      className={`rounded-lg border border-border/40 border-l-[3px] ${borderColor} bg-background overflow-hidden transition-all hover:shadow-sm`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground capitalize">
            {substanceName}
          </span>
          {findings.length > 1 && (
            <span className="ml-2 text-[10px] text-muted-foreground/50">
              {findings.length} interactions
            </span>
          )}
        </div>
        <SeverityBadge severity={highest} />
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2 border-t border-border/30">
          <div className="pt-2 space-y-2">
            {findings.map((f, i) => (
              <FindingCard key={i} finding={f} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Warning Category Card (food / disease)
   ───────────────────────────────────────────── */

function WarningCategoryCard({
  category,
  findings,
}: {
  category: FindingCategory;
  findings: DDIFinding[];
}) {
  const [open, setOpen] = useState(false);
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

  // Group by substance name
  const substanceGroups = useMemo(() => {
    const groups: Record<string, DDIFinding[]> = {};
    for (const f of findings) {
      const name = getSubstanceName(f.description || "Unknown");
      if (!groups[name]) groups[name] = [];
      groups[name].push(f);
    }
    // Sort by highest severity
    return Object.entries(groups).sort(([, a], [, b]) => {
      const sa = SEVERITY_ORDER[getHighestSeverity(a)] ?? 2;
      const sb = SEVERITY_ORDER[getHighestSeverity(b)] ?? 2;
      return sa - sb;
    });
  }, [findings]);

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
      >
        <div
          className={`h-7 w-7 rounded-md ${meta.iconBg} flex items-center justify-center`}
        >
          <Icon className={`h-3.5 w-3.5 ${meta.accent}`} />
        </div>
        <span
          className={`text-xs font-bold uppercase tracking-wider ${meta.accent}`}
        >
          {meta.label}
        </span>
        <span className="ml-1 text-[10px] text-muted-foreground/50">
          {substanceGroups.length} {substanceGroups.length === 1 ? "substance" : "substances"}
        </span>
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground font-medium">
          {findings.length}
        </span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-2">
          {substanceGroups.map(([name, groupFindings]) => (
            <SubstanceGroup
              key={name}
              substanceName={name}
              findings={groupFindings}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Patient Warnings (food/disease, deduplicated)
   ───────────────────────────────────────────── */

function PatientWarnings({
  candidates,
}: {
  candidates: CandidateEvaluation[];
}) {
  const warnings = useMemo(() => {
    const seen = new Set<string>();
    const items: DDIFinding[] = [];
    for (const c of candidates) {
      for (const f of c.findings) {
        const cat = classifyFinding(f);
        if (cat === "food" || cat === "disease") {
          // Deduplicate by substance + description combo
          const substance = getSubstanceName(f.description || "");
          const detail = f.description?.split(" — ").slice(1).join(" — ") || "";
          const key = `${cat}:${substance}:${detail.slice(0, 80)}`;
          if (!seen.has(key)) {
            seen.add(key);
            items.push(f);
          }
        }
      }
    }
    return items;
  }, [candidates]);

  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState<SeverityFilter>("all");

  if (warnings.length === 0) return null;

  const majorCount = warnings.filter(
    (w) => w.severity?.toLowerCase() === "major",
  ).length;
  const moderateCount = warnings.filter(
    (w) => w.severity?.toLowerCase() === "moderate",
  ).length;
  const minorCount = warnings.filter(
    (w) => {
      const s = w.severity?.toLowerCase();
      return s && s !== "major" && s !== "moderate";
    },
  ).length;

  const filtered =
    filter === "all"
      ? warnings
      : filter === "minor"
        ? warnings.filter((w) => {
          const s = w.severity?.toLowerCase();
          return s && s !== "major" && s !== "moderate";
        })
        : warnings.filter((w) => w.severity?.toLowerCase() === filter);

  const food = filtered.filter((f) => classifyFinding(f) === "food");
  const disease = filtered.filter((f) => classifyFinding(f) === "disease");

  // Count unique substances
  const uniqueSubstances = new Set(
    warnings.map((w) => getSubstanceName(w.description || ""))
  ).size;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden animate-slide-in">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center shrink-0">
          <ShieldAlert className="h-[18px] w-[18px] text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Patient Medication Warnings
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            {majorCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {majorCount} major
              </span>
            )}
            {moderateCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {moderateCount} moderate
              </span>
            )}
            {minorCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                {minorCount} minor
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground/50">
            {uniqueSubstances} {uniqueSubstances === 1 ? "substance" : "substances"}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground font-medium bg-muted rounded-full px-2.5 py-1">
            {warnings.length}
          </span>
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {open && (
        <div className="border-t px-5 pb-5 pt-4 space-y-4">
          {/* Severity Filter */}
          <div className="flex gap-1.5">
            {(["all", "major", "moderate", "minor"] as SeverityFilter[]).map((f) => {
              const count =
                f === "all"
                  ? warnings.length
                  : f === "major"
                    ? majorCount
                    : f === "moderate"
                      ? moderateCount
                      : minorCount;
              return (
                <button
                  key={f}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilter(f);
                  }}
                  disabled={count === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg font-medium capitalize transition-all ${filter === f
                    ? "bg-indigo-600 text-white shadow-sm dark:bg-indigo-500"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                    }`}
                >
                  {f}
                  <span className={`text-[10px] ${filter === f ? "opacity-70" : "opacity-50"}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Warning Categories */}
          <div className="space-y-3">
            {food.length > 0 && (
              <WarningCategoryCard category="food" findings={food} />
            )}
            {disease.length > 0 && (
              <WarningCategoryCard category="disease" findings={disease} />
            )}
          </div>

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No {filter} severity warnings found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}


/* ─────────────────────────────────────────────
   FindingCardDrug — used inside DrugCard (shows full desc)
   ───────────────────────────────────────────── */

function FindingCardDrug({ finding }: { finding: DDIFinding }) {
  const [expanded, setExpanded] = useState(false);
  const TEXT_LIMIT = 200;
  const descriptionLong = (finding.description?.length || 0) > TEXT_LIMIT;
  const displayDescription =
    descriptionLong && !expanded
      ? finding.description.slice(0, TEXT_LIMIT) + "..."
      : finding.description;

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background px-4 py-3 transition-colors hover:bg-muted/20">
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-[13px] leading-snug text-foreground">
          {displayDescription}
          {descriptionLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-1 text-[13px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors"
            >
              {expanded ? "Show Less" : "Read More"}
            </button>
          )}
        </p>
        {finding.mechanism && (
          <p className="text-xs text-muted-foreground/70 italic">
            {finding.mechanism}
          </p>
        )}
        {finding.management && (
          <p className="text-xs text-muted-foreground/80 mt-1.5 border-l-2 border-indigo-200 dark:border-indigo-800 pl-2.5 py-0.5">
            {finding.management}
          </p>
        )}
        {finding.action && !finding.management && (
          <span className="inline-block text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50 bg-muted/40 rounded px-1.5 py-0.5 mt-1">
            {finding.action}
          </span>
        )}
      </div>
      <div className="shrink-0 pt-0.5">
        <SeverityBadge severity={finding.severity} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Category Section (collapsible, within drug card)
   ───────────────────────────────────────────── */

function CategorySection({
  category,
  findings,
  defaultOpen,
}: {
  category: FindingCategory;
  findings: DDIFinding[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

  return (
    <div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-2 w-full text-left py-2 group"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
        <Icon className={`h-3.5 w-3.5 ${meta.accent}`} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {meta.label}
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground/40 ml-0.5">
          {findings.length}
        </span>
      </button>
      {open && (
        <div className="ml-6 space-y-2 pb-2">
          {findings.map((f, i) => (
            <FindingCardDrug key={i} finding={f} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Drug Card (single candidate)
   ───────────────────────────────────────────── */

function DrugCard({
  candidate,
  isSelected,
  defaultOpen,
  filter,
}: {
  candidate: CandidateEvaluation;
  isSelected: boolean;
  defaultOpen: boolean;
  filter: SeverityFilter;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const drugFindings = useMemo(
    () =>
      candidate.findings.filter((f) => {
        const cat = classifyFinding(f);
        return cat !== "food" && cat !== "disease";
      }),
    [candidate.findings],
  );

  const filtered = useMemo(
    () =>
      filter === "all"
        ? drugFindings
        : drugFindings.filter(
          (f) => f.severity?.toLowerCase() === filter,
        ),
    [drugFindings, filter],
  );

  const grouped = useMemo(() => {
    const g: Partial<Record<FindingCategory, DDIFinding[]>> = {};
    for (const f of filtered) {
      const cat = classifyFinding(f);
      if (!g[cat]) g[cat] = [];
      g[cat]!.push(f);
    }
    return g;
  }, [filtered]);

  const defaultExpandedCats: FindingCategory[] =
    candidate.status === "REJECTED"
      ? ["ddi", "toxicity"]
      : candidate.status === "CAUTION"
        ? ["ddi"]
        : [];

  return (
    <div
      className={`rounded-xl border border-l-[3px] transition-all ${statusBorder(candidate.status)} ${isSelected
        ? "bg-emerald-50/30 dark:bg-emerald-950/10 shadow-sm"
        : "bg-card hover:shadow-sm"
        }`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] font-semibold capitalize text-foreground">
              {candidate.drug_name}
            </span>
            {isSelected && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wide bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 rounded-md px-2 py-0.5">
                <ShieldCheck className="h-3 w-3" /> SELECTED
              </span>
            )}
          </div>
          {candidate.reason && (
            <p className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-1">
              {candidate.reason}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {drugFindings.length > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground bg-muted rounded-full px-2 py-0.5 hidden sm:inline">
              {drugFindings.length}
            </span>
          )}
          <StatusBadge status={candidate.status} />
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border/40">
          <div className="space-y-1">
            {CAT_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
              <CategorySection
                key={cat}
                category={cat}
                findings={grouped[cat]!}
                defaultOpen={defaultExpandedCats.includes(cat)}
              />
            ))}
          </div>
          {filtered.length === 0 &&
            drugFindings.length > 0 &&
            filter !== "all" && (
              <p className="text-xs text-muted-foreground text-center py-3">
                No {filter} severity findings for this drug.
              </p>
            )}
          {drugFindings.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">
              No drug-specific findings recorded.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════
   Main Export
   ═════════════════════════════════════════════ */

interface DrugEvaluationResultsProps {
  candidates: CandidateEvaluation[];
  selectedDrug: string | null;
  title?: string;
}

export default function DrugEvaluationResults({
  candidates,
  selectedDrug,
  title = "Drug Safety Evaluation",
}: DrugEvaluationResultsProps) {
  const [filter, setFilter] = useState<SeverityFilter>("all");

  const counts = useMemo(() => {
    const c = { REJECTED: 0, CAUTION: 0, SAFE: 0 };
    for (const cand of candidates)
      c[cand.status as keyof typeof c]++;
    return c;
  }, [candidates]);

  const hasFilter = (f: SeverityFilter) => {
    if (f === "all") return true;
    return candidates.some((c) =>
      c.findings.some((fi) => fi.severity?.toLowerCase() === f),
    );
  };

  // Sort: REJECTED → CAUTION → SAFE
  const sorted = useMemo(() => {
    const order: Record<string, number> = {
      REJECTED: 0,
      CAUTION: 1,
      SAFE: 2,
    };
    return [...candidates].sort(
      (a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3),
    );
  }, [candidates]);

  return (
    <div className="space-y-4 animate-slide-in">
      {/* Patient-level warnings */}
      <PatientWarnings candidates={candidates} />

      {/* Drug evaluation section */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Shield className="h-[18px] w-[18px] text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold tracking-tight">
                  {title}
                </h3>
                {selectedDrug && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Recommended:{" "}
                    <span className="font-medium text-foreground capitalize">
                      {selectedDrug}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground font-medium bg-muted rounded-full px-2.5 py-1">
              {candidates.length} evaluated
            </span>
          </div>

          {/* Summary counters */}
          <div className="flex items-center gap-4 text-xs">
            {counts.REJECTED > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-muted-foreground font-medium">
                  {counts.REJECTED} rejected
                </span>
              </span>
            )}
            {counts.CAUTION > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-muted-foreground font-medium">
                  {counts.CAUTION} caution
                </span>
              </span>
            )}
            {counts.SAFE > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground font-medium">
                  {counts.SAFE} safe
                </span>
              </span>
            )}
          </div>

          {/* Severity filter */}
          <div className="flex gap-1.5">
            {(["all", "major", "moderate"] as SeverityFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                disabled={!hasFilter(f)}
                className={`px-3 py-1.5 text-[11px] rounded-lg font-medium capitalize transition-all ${filter === f
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Drug list */}
        <div className="p-4 space-y-3">
          {sorted.map((candidate) => (
            <DrugCard
              key={candidate.drug_name}
              candidate={candidate}
              isSelected={candidate.drug_name === selectedDrug}
              defaultOpen={false}
              filter={filter}
            />
          ))}
        </div>
      </div>
    </div>
  );
}