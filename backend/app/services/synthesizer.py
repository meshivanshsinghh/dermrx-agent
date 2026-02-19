import logging
import re
from dataclasses import dataclass

from app.utils.model_loader import is_mock_mode, get_medgemma
from app.services.classifier import ClassificationResult
from app.services.toxicity import ToxicityProfile

logger = logging.getLogger(__name__)


@dataclass
class SafetyFinding:
    drug_name: str
    finding_type: str
    severity: str
    description: str
    action: str
    management: str | None = None
    mechanism: str | None = None


@dataclass
class SynthesisReport:
    clinical_summary: str
    recommended_treatment: str
    drug_name: str
    reasoning_trace: str
    patient_explanation: str
    safety_findings: list[SafetyFinding]
    rejected_drugs: list[dict]


class SynthesizerService:
    def __init__(self):
        logger.info("SynthesizerService initialized")

    def synthesize(
        self,
        classification: ClassificationResult,
        selected_drug: str,
        safety_findings: list[SafetyFinding],
        toxicity_profile: ToxicityProfile | None,
        rejected_drugs: list[dict],
        patient_medications: list[str],
    ) -> SynthesisReport:
        """
        Generating clinical report from all pipeline findings.

        Args:
            classification: MedSigLIP result
            selected_drug: The safe drug chosen by the agentic loop
            safety_findings: All DDI/toxicity findings across all drugs evaluated
            toxicity_profile: TxGemma profile for the selected drug
            rejected_drugs: List of {drug, reason} for drugs that failed safety
            patient_medications: Original medication list from user
        """
        
        if is_mock_mode():
            return self._mock_synthesize(
                classification, selected_drug, safety_findings,
                toxicity_profile, rejected_drugs, patient_medications,
            )

        return self._real_synthesize(
            classification, selected_drug, safety_findings,
            toxicity_profile, rejected_drugs, patient_medications,
        )

    def _real_synthesize(
        self,
        classification: ClassificationResult,
        selected_drug: str,
        safety_findings: list[SafetyFinding],
        toxicity_profile: ToxicityProfile | None,
        rejected_drugs: list[dict],
        patient_medications: list[str],
    ) -> SynthesisReport:
        #  if we have no safe drug found, we still send to MedGemma
        if selected_drug == "none" or selected_drug is None:
            selected_drug = "none — specialist consultation needed"
            
        model, tokenizer = get_medgemma()

        prompt = self._build_prompt(
            classification, selected_drug, safety_findings,
            toxicity_profile, rejected_drugs, patient_medications,
        )

        logger.info(f"MedGemma prompt length: {len(prompt)} chars")
        logger.debug(f"MedGemma prompt:\n{prompt}")

        # Use chat template for MedGemma (it's an instruction-tuned model)
        messages = [{"role": "user", "content": prompt}]
        formatted = tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        input_ids = tokenizer(formatted, return_tensors="pt").to(model.device)

        outputs = model.generate(
            **input_ids,
            max_new_tokens=512,
            temperature=0.1,
            do_sample=True,
            repetition_penalty=1.05,
        )
        response = tokenizer.decode(
            outputs[0][len(input_ids["input_ids"][0]):],
            skip_special_tokens=True,
        ).strip()

        logger.info(f"MedGemma raw response length: {len(response)} chars")
        logger.info(f"MedGemma response:\n{response}")

        # parsing sections from MedGemma's response
        return self._parse_response(
            response, selected_drug, safety_findings, rejected_drugs,
        )

    def _build_prompt(
        self,
        classification: ClassificationResult,
        selected_drug: str,
        safety_findings: list[SafetyFinding],
        toxicity_profile: ToxicityProfile | None,
        rejected_drugs: list[dict],
        patient_medications: list[str],
    ) -> str:
        rejected_section = ""
        if rejected_drugs:
            lines = []
            for rd in rejected_drugs:
                lines.append(f"- {rd['drug']}: REJECTED — {rd['reason']}")
            rejected_section = "REJECTED TREATMENTS:\n" + "\n".join(lines)

        toxicity_section = ""
        if toxicity_profile:
            flags = [p for p in toxicity_profile.predictions if p.is_flagged]
            if flags:
                lines = [f"- {p.task}: {p.label}" for p in flags]
                toxicity_section = (
                    f"MOLECULAR ANALYSIS ({selected_drug}):\n" + "\n".join(lines)
                )

        findings_section = ""
        if safety_findings:
            lines = [
                f"- {sf.drug_name} + {sf.description} [{sf.severity}] → {sf.action}"
                for sf in safety_findings
            ]
            findings_section = "SAFETY FINDINGS:\n" + "\n".join(lines)

        return f"""You are a clinical decision-support system. Write a concise report for a primary-care physician.

DIAGNOSIS: {classification.display_name}
Confidence: {classification.confidence_level} ({classification.confidence})
Classification Tier: {classification.tier}

PATIENT MEDICATIONS: {', '.join(patient_medications)}

RECOMMENDED TREATMENT: {selected_drug}

{rejected_section}

{findings_section}

{toxicity_section}

Return EXACTLY the four sections below. Use the EXACT headers shown (all-caps, underscores, colon). No markdown, no bullet-points, no extra headers.

CLINICAL_SUMMARY:
<2-3 sentence assessment>

RECOMMENDED_TREATMENT:
<drug name, dose, route, duration>

REASONING:
<why this drug; what was rejected and why>

PATIENT_EXPLANATION:
<plain-language explanation for the patient>"""

    def _parse_response(
        self,
        response: str,
        selected_drug: str,
        safety_findings: list[SafetyFinding],
        rejected_drugs: list[dict],
    ) -> SynthesisReport:
        tags = [
            "CLINICAL_SUMMARY",
            "RECOMMENDED_TREATMENT",
            "REASONING",
            "PATIENT_EXPLANATION",
        ]
        tag_pattern = "|".join(tags)

        def extract(tag: str) -> str:
            m = re.search(
                rf"{tag}:\s*(.*?)(?=\n(?:{tag_pattern}):|$)",
                response,
                re.S,
            )
            return m.group(1).strip() if m else ""

        return SynthesisReport(
            clinical_summary=extract("CLINICAL_SUMMARY"),
            recommended_treatment=extract("RECOMMENDED_TREATMENT"),
            drug_name=selected_drug,
            reasoning_trace=extract("REASONING"),
            patient_explanation=extract("PATIENT_EXPLANATION"),
            safety_findings=safety_findings,
            rejected_drugs=rejected_drugs,
        )

    def _mock_synthesize(
        self,
        classification: ClassificationResult,
        selected_drug: str,
        safety_findings: list[SafetyFinding],
        toxicity_profile: ToxicityProfile | None,
        rejected_drugs: list[dict],
        patient_medications: list[str],
    ) -> SynthesisReport:

        # CASE 1: No safe drug found — all candidates rejected
        if selected_drug == "none" or selected_drug is None:
            rejected_lines = [
                f"{rd['drug']} — {rd['reason']}" for rd in rejected_drugs
            ]
            rejected_text = "; ".join(rejected_lines) if rejected_lines else "safety concerns"

            return SynthesisReport(
                clinical_summary=(
                    f"Patient presents with {classification.display_name} "
                    f"(confidence: {classification.confidence_level}). "
                    f"Current medications: {', '.join(patient_medications)}. "
                    f"All evaluated treatments have significant interactions "
                    f"with the patient's current medications. "
                    f"Specialist consultation recommended."
                ),
                recommended_treatment="Specialist consultation required — no safe option identified",
                drug_name="none",
                reasoning_trace=(
                    f"The system evaluated {len(rejected_drugs)} candidate treatment(s) "
                    f"against the patient's {len(patient_medications)} current medications "
                    f"using DDInter 2.0 and TxGemma. All were rejected: {rejected_text}. "
                    f"A specialist should be consulted to identify safe alternatives."
                ),
                patient_explanation=(
                    f"We checked the requested treatment(s) against your current "
                    f"medications. Unfortunately, all options may interact with your "
                    f"medications and are not recommended without specialist guidance. "
                    f"Please discuss alternative options with your doctor."
                ),
                safety_findings=safety_findings,
                rejected_drugs=rejected_drugs,
            )

        # CASE 2: Selected drug is itself in the rejected list (Mode 2 single drug check)
        drug_is_rejected = any(
            r["drug"] == selected_drug for r in rejected_drugs
        )
        if drug_is_rejected:
            rejection = next(r for r in rejected_drugs if r["drug"] == selected_drug)
            return SynthesisReport(
                clinical_summary=(
                    f"Safety check for {selected_drug} against patient's "
                    f"medications ({', '.join(patient_medications)}): "
                    f"NOT RECOMMENDED. {rejection['reason']}."
                ),
                recommended_treatment=f"{selected_drug} — NOT RECOMMENDED for this patient",
                drug_name=selected_drug,
                reasoning_trace=(
                    f"{selected_drug} was checked against "
                    f"{', '.join(patient_medications)} using DDInter 2.0. "
                    f"Result: {rejection['reason']}. "
                    f"Consider alternative treatments."
                ),
                patient_explanation=(
                    f"Your doctor wanted to check if {selected_drug} is safe "
                    f"with your current medications. Unfortunately, {selected_drug} "
                    f"may interact with your medications and is not recommended. "
                    f"Please discuss alternative options with your doctor."
                ),
                safety_findings=safety_findings,
                rejected_drugs=rejected_drugs,
            )

        # CASE 3: A safe drug was selected — normal report
        rejected_text = ""
        if rejected_drugs:
            rejected_lines = [
                f"{rd['drug']} was avoided due to {rd['reason']}"
                for rd in rejected_drugs
            ]
            rejected_text = " " + ". ".join(rejected_lines) + "."

        tox_text = ""
        if toxicity_profile and toxicity_profile.flagged_count > 0:
            flags = [p for p in toxicity_profile.predictions if p.is_flagged]
            flag_labels = [p.label.lower() for p in flags]
            tox_text = (
                f" Molecular analysis of {selected_drug} indicates: "
                + ", ".join(flag_labels) + "."
            )

        clinical_summary = (
            f"Patient presents with {classification.display_name} "
            f"(confidence: {classification.confidence_level}, "
            f"score: {classification.confidence}). "
            f"Current medications: {', '.join(patient_medications)}. "
            f"After evaluating treatment options against the patient's "
            f"medication profile, {selected_drug} was selected as the "
            f"safest effective treatment.{rejected_text}"
        )

        reasoning = (
            f"The system evaluated candidate treatments for "
            f"{classification.display_name} against the patient's "
            f"{len(patient_medications)} current medications using DDInter 2.0 "
            f"drug interaction database and TxGemma molecular analysis."
            f"{rejected_text}{tox_text} "
            f"{selected_drug} was selected as it has an acceptable safety "
            f"profile with the patient's current medication regimen."
        )

        patient_explanation = (
            f"You have a skin condition called {classification.display_name.lower()}. "
            f"We've checked the recommended treatment ({selected_drug}) against "
            f"all your current medications to make sure it's safe for you. "
            f"{selected_drug} is compatible with your medications."
        )
        if rejected_drugs:
            avoided = [rd["drug"] for rd in rejected_drugs]
            patient_explanation += (
                f" Some other treatments ({', '.join(avoided)}) were not "
                f"recommended because they could interact with your current "
                f"medications."
            )

        return SynthesisReport(
            clinical_summary=clinical_summary,
            recommended_treatment=f"{selected_drug} — consult prescribing guidelines for dosing",
            drug_name=selected_drug,
            reasoning_trace=reasoning,
            patient_explanation=patient_explanation,
            safety_findings=safety_findings,
            rejected_drugs=rejected_drugs,
        )