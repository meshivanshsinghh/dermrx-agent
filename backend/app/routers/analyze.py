import logging
from io import BytesIO

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from PIL import Image 

from app.services.pipeline import PipelineService, PipelineTrace

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["pipeline"])

_pipeline : PipelineService | None = None 

def get_pipeline() -> PipelineService:
    global _pipeline
    if _pipeline is None: 
        _pipeline = PipelineService()
        
    return _pipeline

# Our response models
class SafetyFindingResponse(BaseModel):
    drug_name: str
    finding_type: str
    severity: str
    description: str
    action: str
    management: str | None = None
    mechanism: str | None = None


class DrugEvaluationResponse(BaseModel):
    drug_name: str
    status: str
    reason: str | None = None
    findings: list[SafetyFindingResponse] = []


class ClassificationResponse(BaseModel):
    predicted_category: str
    display_name: str
    tier: int
    confidence: float
    confidence_level: str
    treatment_class: str | None = None
    urgency: str | None = None
    referral: str | None = None
    reason: str | None = None
    safety_flags: list[dict] = []
    top_scores: list[dict] = []


class ReportResponse(BaseModel):
    clinical_summary: str
    recommended_treatment: str
    drug_name: str
    reasoning_trace: str
    patient_explanation: str
    rejected_drugs: list[dict] = []


class AnalyzeResponse(BaseModel):
    mode: str
    classification: ClassificationResponse | None = None
    candidates_evaluated: list[DrugEvaluationResponse] = []
    selected_drug: str | None = None
    report: ReportResponse | None = None
    

# Helper: Converting PipelineTrace to AnalyzeResponse
def trace_to_response(trace: PipelineTrace) -> AnalyzeResponse: 
    classification = None
    if trace.classification: 
        c = trace.classification
        classification = ClassificationResponse(
            predicted_category = c.predicted_category,
            display_name=c.display_name, 
            tier = c.tier, 
            confidence = c.confidence, 
            confidence_level= c.confidence_level,
            treatment_class=c.treatment_class,
            urgency= c.urgency, 
            referral=c.referral, 
            reason= c.reason, 
            safety_flags=[
                {
                    "category": sf.category,
                    "display_name": sf.display_name,
                    "confidence": sf.confidence,
                    "urgency": sf.urgency,
                }
                for sf in c.safety_flags
            ], 
            top_scores=c.top_scores
        )
        
    candidates = []
    for ev in trace.candidates_evaluated:
        candidates.append(DrugEvaluationResponse(
            drug_name=ev.drug.drug_name,
            status = ev.status, 
            reason = ev.reason, 
            findings = [
                SafetyFindingResponse(
                    drug_name=f.drug_name,
                    finding_type=f.finding_type,
                    severity=f.severity,
                    description=f.description,
                    action=f.action,
                    management=f.management,
                    mechanism=f.mechanism,
                )
                for f in ev.ddi_findings
            ]
        ))

    report = None 
    if trace.report: 
        r = trace.report
        report = ReportResponse(
            clinical_summary=r.clinical_summary,
            recommended_treatment=r.recommended_treatment,
            drug_name=r.drug_name,
            reasoning_trace=r.reasoning_trace,
            patient_explanation=r.patient_explanation,
            rejected_drugs=r.rejected_drugs,
        )
    
    return AnalyzeResponse(
        mode=trace.mode,
        classification=classification,
        candidates_evaluated=candidates,
        selected_drug=trace.selected_drug,
        report=report,
    )
    

'''
    /analyze -> This is for full pipeline
    So we do image classification, then treatment, then safety and finally report. 
    Inputs: 
        - image: SKIN IMAGE (JPEG/PNG)
        - patient_medications: Comma-seperated medication list
        
        
    /drug-check -> This is for Doctor's choice
    So doctor specifies a drug and check it against patient medications
    Inputs: 
        - drug_name: Drug to evaluate
        - patient_medications: Comma-seperated medication list
'''


@router.post("/analyze", response_model = AnalyzeResponse)
async def analyze(
    image: UploadFile = File(...), 
    patient_medications: str = Form(...),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image (PNG/JPEG)")
    meds = [m.strip() for m in patient_medications.split(",") if m.strip()]
    if not meds:
        raise HTTPException(400, "At least one medication required")

    # loading image and running pipeline
    try:
        image_bytes = await image.read()
        pil_image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        raise HTTPException(400, f"Could not read image: {e}")
    
    pipeline = get_pipeline()
    trace = await pipeline.analyze(pil_image, meds)

    response = trace_to_response(trace)
    logger.info(f"Analyze complete: mode={response.mode}, selected_drug={response.selected_drug}")
    if response.report:
        logger.info(f"Report clinical_summary: {response.report.clinical_summary[:200]}")
        logger.info(f"Report reasoning_trace: {response.report.reasoning_trace[:200]}")
    for ev in response.candidates_evaluated:
        logger.info(f"  Candidate {ev.drug_name}: {ev.status} | findings={len(ev.findings)}")
    return response

class DrugCheckBody(BaseModel):
    drug_names: list[str] = []
    drug_name: str | None = None
    patient_medications: list[str]
    
@router.post("/drug-check", response_model=AnalyzeResponse)
async def drug_check(body: DrugCheckBody):
    names = body.drug_names or ([body.drug_name] if body.drug_name else [])
    if not names:
        raise HTTPException(400, "At least one drug name required")
    if not body.patient_medications:
        raise HTTPException(400, "At least one medication required")

    pipeline = get_pipeline()
    trace = await pipeline.drug_check(names, body.patient_medications)
    response = trace_to_response(trace)
    logger.info(f"Drug check complete: selected_drug={response.selected_drug}")
    for ev in response.candidates_evaluated:
        logger.info(f"  Candidate {ev.drug_name}: {ev.status} | findings={len(ev.findings)}")
    return response