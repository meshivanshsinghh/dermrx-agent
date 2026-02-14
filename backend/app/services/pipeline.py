import logging 
from dataclasses import dataclass, field 

from app.services.classifier import ClassifierService, ClassificationResult
from app.services.treatment_lookup import TreatmentLookupService, DrugCandidate
from app.services.ddi_checker import get_ddinter_id, check_interactions, build_checker_ids
from app.services.toxicity import ToxicityService, ToxicityProfile
from app.services.synthesizer import (
    SynthesizerService, SynthesisReport, SafetyFinding
)
from app.utils.model_loader import is_mock_mode
from app.services.ddi_checker import mock_check_ddi
from PIL import Image 

logger = logging.getLogger(__name__)

@dataclass
class DrugEvaluation: 
    drug: DrugCandidate
    status: str
    reason: str | None = None 
    ddi_findings: list[SafetyFinding] = field(default_factory = list)
    toxicity_profile: ToxicityProfile | None = None 
    
@dataclass
class PipelineTrace: 
    classification: ClassificationResult | None = None 
    candidates_evaluated: list[DrugEvaluation] = field(default_factory=list)
    selected_drug: str | None = None 
    report: SynthesisReport | None = None 
    mode: str = "analyze"
    

class PipelineService: 
    def __init__(self):
        self.classifier = ClassifierService()
        self.treatment_lookup = TreatmentLookupService()
        self.toxicity = ToxicityService()
        self.synthesizer = SynthesizerService()
        logger.info("PipelineService initialized with all sub-services")
        
    
    '''
        Full pipeline: Image + Medications (def analyze())
        Step 1: Classify 
        Step 2: Getting treatment candidates (clinically ranked)
        Step 3: Agentic loop - evaluating each candidate
        Step 4: Synthesizing report
    '''
    async def analyze(
        self, 
        image: Image.Image, 
        patient_medications: list[str]
    ) -> PipelineTrace: 
        trace = PipelineTrace(mode="analyze")
        
        logger.info("Step 1: MedSigLIP classification")
        classification = self.classifier.classify(image)
        trace.classification = classification
        if classification.tier != 1 or classification.confidence_level == "LOW":
            logger.info("Not Tier 1 HIGH - skipping treatment pipeline")
            trace.report = self._build_non_treatment_report(classification)
            return trace
        
        
        treatment_class = classification.treatment_class
        logger.info(f"Step 2: Treatment lookup for {treatment_class}")
        
        candidates = self.treatment_lookup.get_candidates_ranked(treatment_class)
        if not candidates:
            logger.error(f"No candidates for {treatment_class}")
            return trace
        
    
        logger.info("Step 3: Agentic loop - evaluating each candidate")
        selected_eval = await self._evaluate_candidates(
            candidates, patient_medications, trace,
        )
        if not selected_eval:
            logger.warning("No safe drug found")
            trace.report = self._build_no_safe_drug_report(
                classification, patient_medications, trace,
            )
            return trace
        
        trace.selected_drug = selected_eval.drug.drug_name
        
        logger.info(f"Step 4: MedGemma synthesis for {selected_eval.drug.drug_name}")
        all_findings = []
        rejected = []
        for ev in trace.candidates_evaluated:
            all_findings.extend(ev.ddi_findings)
            if ev.status == "REJECTED":
                rejected.append({
                    "drug": ev.drug.drug_name,
                    "reason": ev.reason, 
                })
                
        report = self.synthesizer.synthesize(
            classification = classification, 
            selected_drug = selected_eval.drug.drug_name,
            safety_findings = all_findings, 
            toxicity_profile= selected_eval.toxicity_profile,
            rejected_drugs=rejected, 
            patient_medications= patient_medications
        )
        trace.report = report 
        
        return trace 

    # Evaluating candidates in order
    async def _evaluate_candidates(
        self, 
        candidates: list[DrugCandidate],
        patient_medications: list[str],
        trace: PipelineTrace
    ) -> DrugEvaluation | None: 
        selected = None 
        
        for candidate in candidates: 
            logger.info(f"Evaluating: {candidate.drug_name}")
            evaluation = await self._evaluate_single_drug(
                candidate, patient_medications
            )
            trace.candidates_evaluated.append(evaluation)
            
            if evaluation.status == "REJECTED":
                logger.info(f"REJECTED: {evaluation.reason}")
                continue
            if evaluation.status in ("SAFE", "CAUTION"):
                logger.info(f"{evaluation.drug} selected with status: {evaluation.status}")
                selected = evaluation
                break 
        return selected
    
    
    '''
        Helper Functions:
        _evaluate_single_drug - Running DDI + TxGemma checks on a single drug
        drug_check -> Doctor's choice (Drug + Medication)
        
        For non-treatment paths:
        _build_non_treatment_report: Report for Tier 2/3 or low confidence
        _build_no_safe_drug_report: Report when all candidates fail safety checks
    '''
    async def _evaluate_single_drug(
        self, 
        drug: DrugCandidate, 
        patient_medications: list[str], 
    ) -> DrugEvaluation:
        evaluation = DrugEvaluation(drug=drug, status="SAFE")
        
        ddi_findings = await self._check_ddi(drug, patient_medications)
        evaluation.ddi_findings = ddi_findings
        
        # CHECKING for Major DDI then we Reject
        major_findings = [f for f in ddi_findings if f.severity == "Major"]
        if major_findings:
            reasons = [f.description for f in major_findings]
            evaluation.status = "REJECTED"
            evaluation.reason = f"Major DDI: {'; '.join(reasons)}"
            return evaluation

        # Check for Moderate DDI → CAUTION
        moderate_findings = [f for f in ddi_findings if f.severity == "Moderate"]
        if moderate_findings:
            evaluation.status = "CAUTION"
            evaluation.reason = "Moderate DDI — monitor closely"

        # TxGemma (only if drug has SMILES)
        if drug.txgemma_eligible and drug.smiles:
            tox_profile = self.toxicity.predict(drug.drug_name, drug.smiles)
            evaluation.toxicity_profile = tox_profile

            for pred in tox_profile.predictions:
                if pred.is_flagged:
                    evaluation.ddi_findings.append(SafetyFinding(
                        drug_name=drug.drug_name,
                        finding_type="TOXICITY",
                        severity="Flag",
                        description=pred.label,
                        action="NOTE",
                    ))
        return evaluation
    
    async def drug_check(
        self, 
        drug_name: str, 
        patient_medications: list[str]
    ) -> PipelineTrace:
        trace = PipelineTrace(mode="drug_check")
        drug = self.treatment_lookup.get_drug_by_name(drug_name)
        if not drug:
            logger.warning(f"Drug {drug_name} not in treatment table")
            # still checking DDI even if not in our table and skipping TxGemma
            drug = DrugCandidate(
                drug_name = drug_name,
                ddinter_name=drug_name.title(),
                rxcui="",
                mesh_sources=[],
                smiles=None,
                txgemma_eligible=False,
                treatment_class="unknown",
            )
            
        evaluation = await self._evaluate_single_drug(drug, patient_medications)
        trace.candidates_evaluated = [evaluation]
        trace.selected_drug = drug.drug_name 
        
        # building a simplified report for Mode 2 
        report = self.synthesizer.synthesize(
            classification=ClassificationResult(
                predicted_category="doctor_specified",
                display_name="Doctor-Specified Treatment",
                tier=1,
                confidence=1.0,
                confidence_level="HIGH",
                treatment_class=drug.treatment_class,
            ),
            selected_drug=drug.drug_name,
            safety_findings=evaluation.ddi_findings,
            toxicity_profile=evaluation.toxicity_profile,
            rejected_drugs=[],
            patient_medications=patient_medications,
        )
        
        trace.report = report 
        return trace
        
    
    
    def _build_non_treatment_report(
        self, classification: ClassificationResult
    ) -> SynthesisReport:
        if classification.tier == 2:
            summary = (
                f"{classification.display_name} identified "
                f"(confidence: {classification.confidence_level}). "
                f"Referral to {classification.referral} recommended "
                f"with {classification.urgency} urgency."
            )
            patient_text = (
                f"The image analysis suggests {classification.display_name.lower()}. "
                f"We recommend you see a {classification.referral} specialist "
                f"for further evaluation."
            )
        elif classification.tier == 3:
            summary = (
                f"{classification.display_name} suspected. "
                f"{classification.reason} "
                f"Specialist evaluation required."
            )
            patient_text = (
                f"The analysis suggests a condition that requires specialist "
                f"evaluation. Please consult with your doctor for next steps."
            )
        else:
            summary = (
                f"Classification confidence too low "
                f"({classification.confidence_level}) for automated "
                f"treatment recommendation. Clinical correlation advised."
            )
            patient_text = (
                f"The image analysis was not confident enough to make a "
                f"specific recommendation. Please consult with your doctor."
            )
        
        return SynthesisReport(
            clinical_summary=summary,
            recommended_treatment="Specialist evaluation recommended",
            drug_name="none",
            reasoning_trace=f"Tier {classification.tier} / {classification.confidence_level} — treatment pipeline not triggered",
            patient_explanation=patient_text,
            safety_findings=[],
            rejected_drugs=[],
        )


    
    def _build_no_safe_drug_report(
        self, 
        classification: ClassificationResult, 
        patient_medications: list[str],
        trace: PipelineTrace
    ) -> SynthesisReport:
        
        rejected = [
            {"drug": ev.drug.drug_name, "reason": ev.reason}
            for ev in trace.candidates_evaluated
            if ev.status == "REJECTED"
        ]
        
        drug_names = [r["drug"] for r in rejected]
        
        return SynthesisReport(
            clinical_summary=(
                f"{classification.display_name} identified, but all evaluated "
                f"treatments ({', '.join(drug_names)}) have significant "
                f"interactions with patient's current medications. "
                f"Specialist consultation recommended."
            ),
            recommended_treatment="Specialist consultation required",
            drug_name="none",
            reasoning_trace=(
                f"Evaluated {len(rejected)} candidates, all rejected due to "
                f"drug interactions with: {', '.join(patient_medications)}"
            ),
            patient_explanation=(
                f"We identified your skin condition as "
                f"{classification.display_name.lower()}, but the standard "
                f"treatments may interact with your current medications. "
                f"Your doctor should consult with a specialist to find "
                f"the safest treatment option for you."
            ),
            safety_findings=[],
            rejected_drugs=rejected,
        )
    
    async def _check_ddi(
        self, 
        drug: DrugCandidate, 
        patient_medications: list[str]
    ) -> list[SafetyFinding]:
        
        if is_mock_mode():
            return self._mock_check_ddi(drug, patient_medications)
        
        findings = []
        
        # getting ddInterID for treatment drug
        treatment_id = get_ddinter_id(drug.ddinter_name)
        if not treatment_id: 
            logger.warning(f"DDInter ID not found for {drug.ddinter_name}")
            return findings

        # getting ddInterIDs for patient medications
        patient_ids = []
        resolved_meds = {}
        
        for med in patient_medications: 
            med_id = get_ddinter_id(med)
            if med_id:
                patient_ids.append(med_id)
                resolved_meds[med_id] = med 
            else: 
                logger.warning(f"Patient med not in DDInter: {med}")
        
        if not patient_ids: 
            return findings
        
        batches = build_checker_ids(treatment_id, patient_ids)
        
        for ids_string in batches:
            try:
                checker_result, details = await check_interactions(
                    ids_string, fetch_details = True,
                )
                # converting DDI results to SafetyFindings
                for di in checker_result.drug_interactions:
                    if treatment_id not in (di.drug_a_id, di.drug_b_id):
                        continue
                    
                    # determining which drug is the patient medication
                    if di.drug_a_id == treatment_id: 
                        other_name = di.drug_b_name
                    else: 
                        other_name = di.drug_a_name
                    
                    description = f"{other_name}"
                    if di.interaction: 
                        description += f" - {di.interaction[:200]}"
                    
                    action = "REJECTED" if di.severity == "Major" else "CAUTION"

                    findings.append(SafetyFinding(
                        drug_name=drug.drug_name,
                        finding_type=f"DDI_{di.severity.upper()}",
                        severity=di.severity,
                        description=description,
                        action=action,
                    ))

            except Exception as e:
                logger.error(f"DDI check failed for batch {ids_string}:{e}")
        
        return findings
        
        
        
    # MOCK implementation
    def _mock_check_ddi(
        self, 
        drug: DrugCandidate,
        patient_medications: list[str]
    ) -> list[SafetyFinding]:
        findings = []
        for med in patient_medications: 
            result = mock_check_ddi(drug.ddinter_name, med)
            if result and result["severity"] in ("Major", "Moderate"): 
                action = "REJECTED" if result["severity"] == "Major" else "CAUTION"
                findings.append(SafetyFinding(
                    drug_name = drug.drug_name, 
                   finding_type=f"DDI_{result['severity'].upper()}",
                    severity=result["severity"],
                    description=f"{med} — {result['description']}",
                    action=action,
                ))
        return findings