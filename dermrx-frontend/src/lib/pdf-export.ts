import jsPDF from "jspdf";
import type { AnalyzeResponse, Patient, CandidateEvaluation } from "./type";
const MARGIN = 20;
const PAGE_W = 210; // A4
const CONTENT_W = PAGE_W - 2 * MARGIN;
const LINE_H = 5.5;

function addPageIfNeeded(doc: jsPDF, y: number, needed: number = 30): number {
  if (y + needed > 280) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function drawSectionHeader(doc: jsPDF, y: number, title: string): number {
  y = addPageIfNeeded(doc, y, 20);
  doc.setFillColor(245, 243, 255); // light indigo bg
  doc.roundedRect(MARGIN, y - 1, CONTENT_W, 8, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(title.toUpperCase(), MARGIN + 3, y + 5);
  doc.setTextColor(0, 0, 0);
  return y + 12;
}

function drawKeyValue(doc: jsPDF, y: number, key: string, value: string, maxWidth: number = CONTENT_W - 10): number {
  y = addPageIfNeeded(doc, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(key, MARGIN + 3, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  const lines = doc.splitTextToSize(value || "—", maxWidth);
  doc.text(lines, MARGIN + 3, y + LINE_H);
  return y + LINE_H + lines.length * LINE_H + 2;
}

function drawWrappedText(doc: jsPDF, y: number, text: string, fontSize: number = 9): number {
  y = addPageIfNeeded(doc, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(50, 50, 50);
  const lines = doc.splitTextToSize(text || "", CONTENT_W - 6);
  for (const line of lines) {
    y = addPageIfNeeded(doc, y, LINE_H + 2);
    doc.text(line, MARGIN + 3, y);
    y += LINE_H;
  }
  return y + 2;
}

export function exportClinicalReportPDF(
  result: AnalyzeResponse,
  patient: Patient,
  imagePreview?: string | null,
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = MARGIN;

  // ═══════════ HEADER ═══════════
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, PAGE_W, 32, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("DermRx Agent", MARGIN, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("AI-Powered Dermatology Clinical Report", MARGIN, 21);
  doc.setFontSize(7);
  doc.text(`Generated: ${new Date().toLocaleString()}`, MARGIN, 27);
  doc.text("Research demonstration — Not for clinical use", PAGE_W - MARGIN, 27, { align: "right" });

  y = 40;

  // ═══════════ PATIENT INFO ═══════════
  y = drawSectionHeader(doc, y, "Patient Information");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(patient.name || "Unknown Patient", MARGIN + 3, y);
  y += 6;

  const details: string[] = [];
  if (patient.age) details.push(`Age: ${patient.age}`);
  if (patient.sex) details.push(`Sex: ${patient.sex}`);
  if (details.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(details.join("  |  "), MARGIN + 3, y);
    y += LINE_H + 1;
  }

  if (patient.medications.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Current Medications:", MARGIN + 3, y);
    y += LINE_H;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(patient.medications.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(", "), MARGIN + 3, y);
    y += LINE_H + 1;
  }

  if (patient.notes) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const noteLines = doc.splitTextToSize(patient.notes, CONTENT_W - 6);
    doc.text(noteLines, MARGIN + 3, y);
    y += noteLines.length * 4 + 2;
  }

  y += 4;

  // ═══════════ DIAGNOSIS ═══════════
  if (result.classification) {
    y = drawSectionHeader(doc, y, "Diagnosis");
    const cls = result.classification;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text(cls.display_name, MARGIN + 3, y);
    y += 7;

    // Tier badge on its own line
    const tierColors: Record<number, [number, number, number]> = {
      1: [16, 185, 129], // emerald
      2: [245, 158, 11], // amber
      3: [239, 68, 68],  // red
    };
    const tierLabels: Record<number, string> = {
      1: "Treatable",
      2: "Safety / Referral",
      3: "Specialist Required",
    };
    const tc = tierColors[cls.tier] || [100, 100, 100];
    const tierText = tierLabels[cls.tier] || `Tier ${cls.tier}`;

    // Draw a small pill-shaped badge
    doc.setFontSize(7);
    const badgeText = `Tier ${cls.tier} — ${tierText}`;
    const badgeW = doc.getTextWidth(badgeText) + 6;
    doc.setFillColor(tc[0], tc[1], tc[2]);
    doc.roundedRect(MARGIN + 3, y - 3.5, badgeW, 5.5, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(badgeText, MARGIN + 6, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);

    if (cls.treatment_class) {
      doc.text(`Treatment Class: ${cls.treatment_class.replace(/_/g, " ")}`, MARGIN + 3, y);
      y += LINE_H;
    }

    y += 4;
  }

  // ═══════════ DRUG EVALUATION SUMMARY ═══════════  
  if (result.candidates_evaluated.length > 0) {
    y = drawSectionHeader(doc, y, "Drug Safety Evaluation");

    const rejected = result.candidates_evaluated.filter((c) => c.status === "REJECTED");
    const caution = result.candidates_evaluated.filter((c) => c.status === "CAUTION");
    const safe = result.candidates_evaluated.filter((c) => c.status === "SAFE");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `${result.candidates_evaluated.length} drugs evaluated  |  ${rejected.length} rejected  |  ${caution.length} caution  |  ${safe.length} safe`,
      MARGIN + 3, y,
    );
    y += LINE_H + 3;

    // Table header
    doc.setFillColor(240, 240, 245);
    doc.rect(MARGIN, y - 1, CONTENT_W, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text("DRUG", MARGIN + 3, y + 4);
    doc.text("STATUS", MARGIN + 70, y + 4);
    doc.text("REASON", MARGIN + 95, y + 4);
    y += 10;

    for (const cand of result.candidates_evaluated) {
      y = addPageIfNeeded(doc, y, 12);

      const statusColors: Record<string, [number, number, number]> = {
        REJECTED: [239, 68, 68],
        CAUTION: [245, 158, 11],
        SAFE: [16, 185, 129],
      };
      const sc = statusColors[cand.status] || [100, 100, 100];

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(cand.drug_name.charAt(0).toUpperCase() + cand.drug_name.slice(1), MARGIN + 3, y);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(sc[0], sc[1], sc[2]);
      doc.text(cand.status, MARGIN + 70, y);

      if (cand.reason) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 100, 100);
        const reasonLines = doc.splitTextToSize(cand.reason, 70);
        doc.text(reasonLines[0], MARGIN + 95, y);
        if (reasonLines.length > 1) {
          y += LINE_H;
          doc.text(reasonLines[1], MARGIN + 95, y);
        }
      }

      // Light divider
      y += 3;
      doc.setDrawColor(230, 230, 230);
      doc.line(MARGIN + 3, y, MARGIN + CONTENT_W - 3, y);
      y += 4;
    }

    // Source attribution
    y += 2;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text("Sources: DDInter 2.0 (drug interactions) · TxGemma-2B (molecular toxicity) · PubChem (SMILES) · MED-RT/FDA (drug candidates)", MARGIN + 3, y);
    y += 8;
  }

  // ═══════════ CLINICAL REPORT ═══════════
  if (result.report) {
    const rpt = result.report;

    y = drawSectionHeader(doc, y, "Clinical Summary");
    y = drawWrappedText(doc, y, rpt.clinical_summary);
    y += 3;

    // Recommended treatment — highlighted box (tier-aware)
    const tier = result.classification?.tier ?? 1;
    const isDrugTier = tier === 1 && rpt.drug_name && rpt.drug_name.toLowerCase() !== "none";
    const boxH = isDrugTier ? 18 : 14;
    y = addPageIfNeeded(doc, y, boxH + 6);

    const treatmentFills: Record<number, [number, number, number]> = {
      1: [236, 253, 245],  // emerald-50
      2: [255, 251, 235],  // amber-50
      3: [254, 242, 242],  // red-50
    };
    const treatmentBorders: Record<number, [number, number, number]> = {
      1: [16, 185, 129],   // emerald-500
      2: [245, 158, 11],   // amber-500
      3: [239, 68, 68],    // red-500
    };
    const treatmentLabels: Record<number, [string, [number, number, number]]> = {
      1: ["RECOMMENDED TREATMENT", [5, 150, 105]],
      2: ["REFERRAL RECOMMENDATION", [180, 120, 10]],
      3: ["URGENT RECOMMENDATION", [185, 50, 50]],
    };

    const tFill = treatmentFills[tier] || treatmentFills[1];
    const tBorder = treatmentBorders[tier] || treatmentBorders[1];
    const [tLabel, tLabelColor] = treatmentLabels[tier] || treatmentLabels[1];

    doc.setFillColor(tFill[0], tFill[1], tFill[2]);
    doc.setDrawColor(tBorder[0], tBorder[1], tBorder[2]);
    doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(tLabelColor[0], tLabelColor[1], tLabelColor[2]);
    doc.text(tLabel, MARGIN + 4, y + 5);

    if (isDrugTier) {
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(rpt.drug_name.charAt(0).toUpperCase() + rpt.drug_name.slice(1), MARGIN + 4, y + 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      const treatmentLines = doc.splitTextToSize(rpt.recommended_treatment, CONTENT_W - 8);
      if (treatmentLines.length === 1) {
        doc.text(treatmentLines[0], MARGIN + 4, y + 16);
      }
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      const recLines = doc.splitTextToSize(rpt.recommended_treatment, CONTENT_W - 8);
      doc.text(recLines[0], MARGIN + 4, y + 11);
    }
    y += boxH + 6;

    // Clinical reasoning
    y = drawSectionHeader(doc, y, "Clinical Reasoning");
    y = drawWrappedText(doc, y, rpt.reasoning_trace);
    y += 2;

    // Patient explanation
    y = drawSectionHeader(doc, y, "Patient Explanation");
    y = addPageIfNeeded(doc, y, 15);
    doc.setDrawColor(200, 200, 210);
    doc.setLineWidth(0.5);
    doc.line(MARGIN + 2, y - 1, MARGIN + 2, y + 3); // left border
    y = drawWrappedText(doc, y, rpt.patient_explanation, 9);
    y += 2;

    // Rejected alternatives
    if (rpt.rejected_drugs && rpt.rejected_drugs.length > 0) {
      y = drawSectionHeader(doc, y, "Alternatives Considered");
      for (const item of rpt.rejected_drugs) {
        y = addPageIfNeeded(doc, y, 18);
        const drugName = typeof item === "string" ? item : item.drug;
        const reason = typeof item === "string" ? null : item.reason;
        const displayName = drugName.charAt(0).toUpperCase() + drugName.slice(1);

        // Drug name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        const nameWidth = doc.getTextWidth(displayName);
        doc.text(displayName, MARGIN + 3, y);

        // REJECTED badge — offset based on name width at current font
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(239, 68, 68);
        doc.text("REJECTED", MARGIN + 3 + nameWidth + 4, y);
        y += LINE_H + 1;

        if (reason) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          const reasonLines = doc.splitTextToSize(reason, CONTENT_W - 6);
          for (const line of reasonLines) {
            y = addPageIfNeeded(doc, y, LINE_H + 2);
            doc.text(line, MARGIN + 3, y);
            y += LINE_H;
          }
        }

        // Light divider between alternatives
        y += 2;
        doc.setDrawColor(235, 235, 235);
        doc.line(MARGIN + 3, y, MARGIN + CONTENT_W - 3, y);
        y += 4;
      }
    }
  }

  // ═══════════ DISCLAIMER BOX ═══════════
  y = addPageIfNeeded(doc, y, 30);
  y += 4;
  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(200, 200, 210);
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("IMPORTANT DISCLAIMER", MARGIN + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  const disclaimerLines = doc.splitTextToSize(
    "This report is generated by DermRx Agent, a research demonstration for the MedGemma Impact Challenge. " +
    "It is NOT intended for clinical use. All treatment recommendations must be verified by a qualified healthcare professional. " +
    "Data sources: DDInter 2.0, MED-RT (FDA/VA), PubChem, TxGemma-2B, MedGemma-4B, MedSigLIP.",
    CONTENT_W - 8,
  );
  doc.text(disclaimerLines, MARGIN + 4, y + 10);

  // ═══════════ FOOTER ═══════════
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      "DermRx Agent — Research demonstration for MedGemma Impact Challenge · Not for clinical use",
      PAGE_W / 2, 290, { align: "center" },
    );
    doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN, 290, { align: "right" });
  }

  // Save
  const safeName = (patient.name || "patient").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  doc.save(`dermrx_report_${safeName}_${date}.pdf`);
}
