import logging
from fastapi import APIRouter, HTTPException, Query

from app.models.responses import (
    CheckerResult,
    DrugSearchResponse, 
    DDICheckResponse,
    SeveritySummary
)

from app.services.ddi_checker import (
    search_drugs, 
    get_ddinter_id, 
    build_checker_ids, 
    check_interactions,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["DDI"])

# drug search (autocomplete)
@router.get("/drugs/search", response_model = DrugSearchResponse)
def drug_search(q:str=Query(..., min_length=2, description="Drug name to search")):
    results = search_drugs(q)
    return DrugSearchResponse(
        query = q, 
        count = len(results),
        results=results,
    )
    
# full ddi check (by ddinter ids)
@router.get("/ddi/check/{ids_string}", response_model = DDICheckResponse)
async def check_ddi_by_ids(ids_string: str):
    ids = ids_string.split("-")
    if not all(id.startswith("DDInter") for id in ids):
        raise HTTPException(
            status_code=400, 
            detail = "Invalid format. IDs must be like DDInter743-DDInter1164"
        )
        
    if len(ids) < 2:
        raise HTTPException(
            status_code=400, 
            detail="Need at least 2 drug IDs to check interactions"
        )
        
    try: 
        checker_result, details = await check_interactions(ids_string)
    except ValueError as e: 
        raise HTTPException(status_code=404, detail = str(e))
    except Exception as e: 
        raise HTTPException(status_code=502, detail=f"DDInter request failed: {e}")
    
    return DDICheckResponse(
        checker_result=checker_result, 
        details=details
    )
    
# full ddi check (by drug names)
@router.get("/ddi/check-by-name", response_model = DDICheckResponse)
async def check_ddi_by_names(
    drugs: str = Query(..., description="Comma-seperated drug names")
):
    drug_names = [d.strip() for d in drugs.split(",") if d.strip()]
    
    if len(drug_names) < 2:
        raise HTTPException(
            status_code=400, 
            detail="Need at least 2 drug names"
        )
    
    # resolving names to DDInter IDs
    resolved = []
    not_found = []
    for name in drug_names: 
        ddinter_id = get_ddinter_id(name)
        if ddinter_id:
            resolved.append(ddinter_id)
        else:
            not_found.append(name)
            
    if not_found: 
        raise HTTPException(
            status_code = 404, 
            detail = f"Drugs not found in DDInter database: {', '.join(not_found)}"
        )
    
    if len(resolved) < 2: 
        raise HTTPException(
            status_code=400, 
            detail = "Need at least 2 valid drugs to check interactions"
        )
        
    # less than 5 drugs
    if len(resolved) <= 5:
        ids_string = "-".join(resolved)
        try:
            checker_result, details = await check_interactions(ids_string)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"DDInter request failed: {e}")

        return DDICheckResponse(
            checker_result=checker_result,
            details=details,
        )

    # more than 5 drugs
    # first drug is treated as the "treatment drug", rest are patient meds
    treatment_id = resolved[0]
    patient_ids = resolved[1:]
    batches = build_checker_ids(treatment_id, patient_ids)

    # Run each batch and merge results
    all_drug_interactions = []
    all_disease_interactions = []
    all_food_interactions = []
    all_details = []
    all_drug_ids = set()
    all_drug_names = set()

    for batch_ids in batches:
        try:
            result, details = await check_interactions(batch_ids)
            all_drug_interactions.extend(result.drug_interactions)
            all_disease_interactions.extend(result.disease_interactions)
            all_food_interactions.extend(result.food_interactions)
            all_details.extend(details)
            all_drug_ids.update(result.drug_ids)
            all_drug_names.update(result.drug_names)
        except Exception as e:
            logger.error(f"Batch {batch_ids} failed: {e}")

    if not all_drug_interactions:
        raise HTTPException(status_code=502, detail="All DDInter batches failed")

    summary = SeveritySummary()
    for di in all_drug_interactions:
        match di.severity:
            case "Major": summary.major += 1
            case "Moderate": summary.moderate += 1
            case "Minor": summary.minor += 1
            case _: summary.unknown += 1

    seen_disease = set()
    unique_disease = []
    for d in all_disease_interactions:
        key = (d.drug_id, d.disease_name)
        if key not in seen_disease:
            seen_disease.add(key)
            unique_disease.append(d)

    seen_food = set()
    unique_food = []
    for f in all_food_interactions:
        key = (f.drug_id, f.food_name)
        if key not in seen_food:
            seen_food.add(key)
            unique_food.append(f)

    merged_result = CheckerResult(
        drug_ids=sorted(all_drug_ids),
        drug_names=sorted(all_drug_names),
        severity_summary=summary,
        drug_interactions=all_drug_interactions,
        disease_interactions=unique_disease,
        food_interactions=unique_food,
    )

    return DDICheckResponse(
        checker_result=merged_result,
        details=all_details,
    )