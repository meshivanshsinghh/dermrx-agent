"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, User, Pill, Search, Stethoscope, Shield, Sparkles } from "lucide-react";
import { searchDrugs } from "@/lib/api";
import { Patient } from "@/lib/type";
import { generatePatientId } from "@/lib/storage";

interface NewPatientDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (patient: Patient, mode: "analyze" | "drug_check") => void;
  initialMode: "analyze" | "drug_check";
  existingPatient?: Patient | null;
  editOnly?: boolean;
}

export default function NewPatientDialog({
  open, onClose, onSubmit, initialMode, existingPatient, editOnly = false,
}: NewPatientDialogProps) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "other" | "">("");
  const [medications, setMedications] = useState<string[]>([]);
  const [medInput, setMedInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notes, setNotes] = useState("");
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (!open) return;
    if (existingPatient) {
      setName(existingPatient.name);
      setAge(existingPatient.age?.toString() || "");
      setSex(existingPatient.sex || "");
      setMedications(existingPatient.medications);
      setNotes(existingPatient.notes || "");
    } else {
      setName(""); setAge(""); setSex(""); setMedications([]); setNotes("");
    }
    setMedInput(""); setSuggestions([]);
  }, [open, existingPatient]);

  // Drug autocomplete
  useEffect(() => {
    if (medInput.length < 2) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await searchDrugs(medInput);
      setSuggestions(results.filter((r) => !medications.some((m) => m.toLowerCase() === r.toLowerCase())));
      setShowSuggestions(true);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [medInput, medications]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const addMedication = (med?: string) => {
    const t = (med || medInput).trim();
    if (t && !medications.some((m) => m.toLowerCase() === t.toLowerCase())) {
      setMedications([...medications, t]);
      setMedInput(""); setShowSuggestions(false);
    }
  };

  const loadDemo = () => {
    setName("Jack Alto"); setAge("45"); setSex("male");
    setMedications(["warfarin", "metformin", "lisinopril"]);
    setNotes("Type 2 diabetes, hypertension, history of DVT");
  };

  const handleSubmit = () => {
    const patient: Patient = {
      id: existingPatient?.id || generatePatientId(),
      name: name.trim() || "Unknown Patient",
      age: age ? parseInt(age) : undefined,
      sex: sex || undefined,
      medications,
      notes: notes.trim() || undefined,
      createdAt: existingPatient?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSubmit(patient, initialMode);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{existingPatient ? "Edit Patient" : "New Patient"}</h2>
              <p className="text-xs text-muted-foreground">Enter patient details and current medications</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <button onClick={loadDemo} className="flex items-center gap-2 text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
            <Sparkles className="h-3 w-3" /><span>Load demo patient</span>
          </button>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Patient Name <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Doe" autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
          </div>

          {/* Age + Sex */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Age</label>
              <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="45" min={0} max={150}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Sex</label>
              <div className="flex gap-2">
                {(["male", "female", "other"] as const).map((s) => (
                  <button key={s} onClick={() => setSex(sex === s ? "" : s)}
                    className={`flex-1 px-3 py-2.5 text-xs rounded-lg border transition-all capitalize ${sex === s ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400" : "border-input hover:bg-accent"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Medications with autocomplete */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5"><Pill className="h-3.5 w-3.5" />Current Medications</label>
            <div className="relative" ref={suggestionsRef}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="text" value={medInput} onChange={(e) => setMedInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMedication(); } }}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Search medications..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                </div>
                <Button variant="outline" size="sm" onClick={() => addMedication()} className="h-[42px]">Add</Button>
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-neutral-900 border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => addMedication(s)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors capitalize">{s}</button>
                  ))}
                </div>
              )}
            </div>
            {medications.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {medications.map((med) => (
                  <Badge key={med} className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 cursor-pointer hover:bg-red-100 hover:text-red-700 transition-colors capitalize"
                    onClick={() => setMedications(medications.filter((m) => m !== med))}>
                    <Pill className="h-3 w-3 mr-1" />{med}<X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">These will be used for DDI checking across all sessions for this patient.</p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Clinical Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Type 2 diabetes, hypertension..." rows={2}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t px-6 py-4 rounded-b-2xl">
          <Button onClick={handleSubmit} disabled={!name.trim()} size="lg"
            className={`w-full text-white ${editOnly ? "bg-indigo-600 hover:bg-indigo-700" : initialMode === "analyze" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
            {editOnly ? <><Pill className="h-4 w-4 mr-2" />Save Changes</> : initialMode === "analyze" ? <><Stethoscope className="h-4 w-4 mr-2" />Start Analysis</> : <><Shield className="h-4 w-4 mr-2" />Start Drug Check</>}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground mt-2">Patient data is stored locally on your device only.</p>
        </div>
      </div>
    </div>
  );
}