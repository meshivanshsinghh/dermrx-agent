import re 
import json 
import time
import logging
import httpx 
import pandas as pd
from bs4 import BeautifulSoup
from cachetools import TTLCache

from app.config import (
    DDINTER2_BASE_URL, 
    DDINTER2_REQUEST_DELAY, 
    DDINTER2_CACHE_TTL, 
    DDINTER2_MAX_DRUGS_PER_URL, 
    DRUG_LOOKUP_CSV
)

from app.models.responses import (
    DrugInteraction, 
    MechanismFlags, 
    DiseaseInteraction, 
    FoodInteraction, 
    InteractionDetail, 
    AlternativeDrugs, 
    CheckerResult, 
    SeveritySummary, 
    DrugSearchResult, 
    SEVERITY_MAP
)

logger = logging.getLogger(__name__)


# Loading Cache and Drug Lookup
_checker_cache: TTLCache = TTLCache(maxsize=128, ttl=DDINTER2_CACHE_TTL)
_detail_cache: TTLCache = TTLCache(maxsize=256, ttl=DDINTER2_CACHE_TTL)
_drug_lookup_df: pd.DataFrame | None = None 


# loading the drug lookup csv once
def _get_drug_lookup() -> pd.DataFrame:
    global _drug_lookup_df
    if _drug_lookup_df is None:
        _drug_lookup_df = pd.read_csv(DRUG_LOOKUP_CSV)
        _drug_lookup_df["drug_name_lower"] = _drug_lookup_df["drug_name"].str.lower()
        logger.info(f"Loaded {len(_drug_lookup_df)} drugs from CSV")
    return _drug_lookup_df


# searching drugs by partial name match
def search_drugs(query: str, limit: int = 10) -> list[DrugSearchResult]:
    if not query or len(query) < 2:
        return []
    
    df = _get_drug_lookup()
    query_lower = query.lower()
    matches = df[df["drug_name_lower"].str.contains(query_lower, na=False)]
    matches = matches.head(limit)
    
    return [
        DrugSearchResult(drug_name=row["drug_name"], ddinter_id=row["ddinter_id"])
        for _, row in matches.iterrows()
    ]
    
# getting DDInterID for a drug
def get_ddinter_id(drug_name:str) -> str | None:
    df = _get_drug_lookup()
    match = df[df["drug_name_lower"] == drug_name.lower()]
    if len(match) > 0:
        return match.iloc[0]["ddinter_id"]
    return None


'''
    Batch URL Builder: Building DDInter ID strings for checker URLs. We can only
    do Max 5 IDs per URL. Reserving 1 spot for treatment drug, 
    batch patient meds in group of 4.
'''
def builder_checker_ids(treatment_id: str, patient_med_ids: list[str]) -> list[str]:
    batch_size = DDINTER2_MAX_DRUGS_PER_URL - 1 
    batches = []
    
    for i in range(0, len(patient_med_ids), batch_size):
        batch = patient_med_ids[i:i + batch_size]
        all_ids = [treatment_id] + batch 
        batches.append("-".join(all_ids))
    
    return batches

'''
    Main Logic: 
    STEP 1: Checker Page (drug-drug interaction)
    STEP 2: Disease Interaction API
    STEP 3: Food Interaction API
    STEP 4: Detail Page (mechanism type + alternatives)
'''

def _parse_checker_page(html:str) -> tuple[list[DrugInteraction], str | None, 
                                           list[str], list[str]]:
    
    # extracting csr token
    csrf_match = re.search(r"csrfmiddlewaretoken:\s*'([^']+)'", html)
    csrf_token = csrf_match.group(1) if csrf_match else None
    
    if not csrf_token:
        logger.warning("CSRF token was not found")
    
    data_match = re.search(r"let response_data = (\[.*?\]);", html, re.DOTALL)
    if not data_match:
        logger.error("response_data not found")
        return [], csrf_token, [], []

    raw_data = json.loads(data_match.group(1))
    
    # extracting drug names
    names_match = re.search(r"let name = (\[.*?\]);", html)
    drug_names = json.loads(names_match.group(1)) if names_match else []
    
    # parsing each interactrion
    interactions = []
    drug_ids_seen = set()
    
    for item in raw_data: 
        drug_ids_seen.add(item["internalID_a_id"])
        drug_ids_seen.add(item["internalID_b_id"])
        
        interaction_text = item.get("idx__interaction_description")
        if interaction_text and interaction_text.strip() == "-":
            interaction_text = None 
            
        management_text = item.get("idx__management")
        if management_text and management_text.strip() == "-":
            management_text = None 
        
        interaction = DrugInteraction(
            interaction_id=item["id"],
            drug_a_id=item["internalID_a_id"],
            drug_b_id=item["internalID_b_id"],
            drug_a_name=item["drug_a_name"],
            drug_b_name=item["drug_b_name"],
            severity=item["idx__level"],
            interaction=interaction_text,
            management=management_text,
            mechanism_flags=MechanismFlags(
                absorption=item.get("idx__absorption") == "1",
                distribution=item.get("idx__distribution") == "1",
                metabolism=item.get("idx__metabolism") == "1",
                excretion=item.get("idx__excretion") == "1",
                synergistic_effect=item.get("idx__synergistic_effect") == "1",
                antagonistic_effect=item.get("idx__antagonistic_effect") == "1",
            ),
            detail_url=f"/server/interact/{item['id']}/",
        )
        interactions.append(interaction)
   
    drug_ids = sorted(drug_ids_seen)
    return interactions, csrf_token, drug_ids, drug_names
    

def _parse_disease_response(data:dict) -> list[DiseaseInteraction]:
    results = []
    for item in data.get("data", []):
        ref_text = item.get("references", "")
        ref_count = len(ref_text.split("|")) if ref_text else 0
        
        results.append(DiseaseInteraction(
            interaction_id=item["interaction_id"],
            drug_id=item["internal_id"],
            drug_name=item["drugName"],
            severity=SEVERITY_MAP.get(item.get("level", ""), "Unknown"),
            disease_name=item["diseaseName"],
            description=item.get("text"),
            reference_count=ref_count,
        ))
        
    return results


def _parse_food_response(data:dict) -> list[FoodInteraction]:
    results = []
    for item in data.get("data", []):
        ref_text = item.get("references", "")
        ref_count = len(ref_text.split("|")) if ref_text else 0

        results.append(FoodInteraction(
            interaction_id=item["interaction_id"],
            drug_id=item["internal_id"],
            drug_name=item["drugName"],
            severity=SEVERITY_MAP.get(item.get("level", ""), "Unknown"),
            food_name=item["foodName"],
            interaction=item.get("newInteraction"),
            management=item.get("newManagement"),
            mechanism=item.get("magnesium"),
            reference_count=ref_count,
        ))
    return results

def _parse_detail_page(html:str, interaction_id: int) -> InteractionDetail:
    soup = BeautifulSoup(html, "html.parser")
    badges = soup.find_all("span", class_="badge")
    mechanism_type = None 
    known_severities = {"Major", "Moderate", "Minor", "Unknown"}

    for badge in badges:
        text = badge.get_text(strip=True)
        # skipping severity badges and ATC codes
        if text not in known_severities and not re.match(r"^[A-Z]\d{2}[A-Z]?$", text):
            mechanism_type = text
            break
        
    # alternative drugs
    alternatives = []
    alt_elements = soup.find_all(string=re.compile(r"Alternative for"))

    for alt_text in alt_elements:
        name_match = re.search(r"Alternative for\s+(.+)", alt_text.strip())
        if not name_match:
            continue
        drug_name = name_match.group(1).strip()
        
        # finding the parent container and getting all linked drug names
        parent = alt_text.find_parent("tr") or alt_text.find_parent("div")
        if not parent:
            continue
        
        # now finding the alternative drug names
        links = parent.find_all("a")
        alt_drug_names = []
        for link in links:
            name = link.get_text(strip=True)
            if name and name != drug_name:
                alt_drug_names.append(name)
                
        # deduplicate while preserving order
        seen = set() 
        unique_alts = []
        for name in alt_drug_names:
            if name not in seen: 
                seen.add(name)
                unique_alts.append(name)
                
        alternatives.append(AlternativeDrugs(
            drug_name=drug_name,
            alternatives=unique_alts,
        ))
        
    return InteractionDetail(
        interaction_id=interaction_id, 
        mechanism_type=mechanism_type, 
        alternatives=alternatives
    )


'''
    Main Orchestrator:
    Full DDI check for a set of DDInter IDs. 
    Args: 
        ids_string: Hypen-seperated DDInterIDs (like "DDInter743-DDInter1164")
        fetch_details: whether to fetch Major/Moderate interactions
        
    Returns:
        (CheckerResult, list of InteractionDetail)
'''

async def check_interactions(
    ids_string: str, 
    fetch_details: bool = True, 
) -> tuple[CheckerResult, list[InteractionDetail]]:
    
    if ids_string in _checker_cache:
        logger.info(f"Cache hit for {ids_string}")
        return _checker_cache[ids_string]
    
    checker_url = f"{DDINTER2_BASE_URL}/checker/result/{ids_string}"
    
    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client: 
        resp = await client.get(checker_url)
        resp.raise_for_status()
        
        # ERROR HANDLING
        drug_interactions, csrf_token, drug_ids, drug_names = _parse_checker_page(resp.text)
        if not drug_interactions:
            raise ValueError(
                f"DDInter returned no interaction data"
                f"Check that DDInterIDs are valid: {ids_string}"
            )
        if not csrf_token:
            logger.warning("CSRF token not found - disease and food data would be unavailable.")
        
        summary = SeveritySummary()
        for di in drug_interactions:
            match di.severity:
                case "Major": summary.major += 1
                case "Moderate": summary.moderate += 1
                case "Minor": summary.minor += 1
                case _: summary.unknown += 1
                
        disease_interactions = []
        if csrf_token:
            time.sleep(DDINTER2_REQUEST_DELAY)
            dis_url = f"{DDINTER2_BASE_URL}/server/interact-with-dis/{ids_string}/"
            try:
                dis_resp = await client.post(
                    dis_url,
                    data={
                        "csrfmiddlewaretoken": csrf_token,
                        "severity": "",
                        "draw": "1",
                        "start": "0",
                        "length": "200",
                    },
                    headers={
                        "Referer": checker_url,
                        "X-Requested-With": "XMLHttpRequest",
                    },
                )
                dis_resp.raise_for_status()
                disease_interactions = _parse_disease_response(dis_resp.json())
            except Exception as e:
                logger.error(f"Failed to fetch disease interactions: {e}")
        
        food_interactions = []
        if csrf_token:
            time.sleep(DDINTER2_REQUEST_DELAY)
            food_url = f"{DDINTER2_BASE_URL}/server/interact-with-food/{ids_string}/"
            
            try:
                food_resp = await client.post(
                    food_url,
                    data={
                        "csrfmiddlewaretoken": csrf_token,
                        "severity": "",
                        "mechanism": "",
                        "draw": "1",
                        "start": "0",
                        "length": "200",
                    },
                    headers={
                        "Referer": checker_url,
                        "X-Requested-With": "XMLHttpRequest",
                    },
                )
                food_resp.raise_for_status()
                food_interactions = _parse_food_response(food_resp.json())
            except Exception as e:
                logger.error(f"Failed to fetch food interactions: {e}")
        
        details = []
        if fetch_details:
            significant = [
                di for di in drug_interactions
                if di.severity in ("Major", "Moderate")
            ]
            for di in significant:
                cache_key = f"detail_{di.interaction_id}"
                if cache_key in _detail_cache:
                    details.append(_detail_cache[cache_key])
                    continue

                time.sleep(DDINTER2_REQUEST_DELAY)
                detail_url = f"{DDINTER2_BASE_URL}{di.detail_url}"
                try:
                    detail_resp = await client.get(detail_url)
                    detail_resp.raise_for_status()
                    detail = _parse_detail_page(detail_resp.text, di.interaction_id)
                    details.append(detail)
                    _detail_cache[cache_key] = detail
                except Exception as e:
                    logger.error(f"Failed to fetch detail page {di.interaction_id}: {e}")

    # building final result
    checker_result = CheckerResult(
        drug_ids=drug_ids,
        drug_names=drug_names,
        severity_summary=summary,
        drug_interactions=drug_interactions,
        disease_interactions=disease_interactions,
        food_interactions=food_interactions,
    )
    
    _checker_cache[ids_string] = (checker_result, details)

    return checker_result, details