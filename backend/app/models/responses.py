from pydantic import BaseModel

# DRUG-DRUG Interaction
class MechanismFlags(BaseModel):
    absorption: bool = False 
    distribution: bool = False
    metabolism: bool = False
    excretion: bool = False
    synergistic_effect: bool = False
    antagonistic_effect: bool = False

class DrugInteraction(BaseModel):
    interaction_id: int         
    drug_a_id: str                         
    drug_b_id: str                               
    drug_a_name: str                          
    drug_b_name: str                  
    severity: str                        
    interaction: str | None = None              
    management: str | None = None        
    mechanism_flags: MechanismFlags
    detail_url: str
    
# DISEASE Interaction (/server/interact-with-dis/)
SEVERITY_MAP = {"3": "Major", "2": "Moderate", "1": "Minor"}

class DiseaseInteraction(BaseModel):
    interaction_id: int
    drug_id: str
    drug_name: str
    severity: str
    disease_name: str
    description: str | None = None
    reference_count: int = 0
    
# FOOD INTERACTION (/server/interact-with-food/)
class FoodInteraction(BaseModel):
    interaction_id: int
    drug_id: str
    drug_name: str
    severity: str
    food_name: str
    interaction: str | None = None
    management: str | None = None
    mechanism: str | None = None
    reference_count: int = 0


# Detail Page (/server/interact/{id})
class AlternativeDrugs(BaseModel):
    drug_name: str
    alternatives: list[str] = []


class InteractionDetail(BaseModel):
    interaction_id: int
    mechanism_type: str | None = None
    alternatives: list[AlternativeDrugs] = []
    
    
# Combined Results
class SeveritySummary(BaseModel):
    major: int = 0
    moderate: int = 0
    minor: int = 0
    unknown: int = 0

class CheckerResult(BaseModel):
    drug_ids: list[str]
    drug_names: list[str]
    severity_summary: SeveritySummary
    drug_interactions: list[DrugInteraction]
    disease_interactions: list[DiseaseInteraction]
    food_interactions: list[FoodInteraction]

# Drug Search from my CSV
class DrugSearchResult(BaseModel):
    drug_name: str
    ddinter_id: str


class DrugSearchResponse(BaseModel):
    query: str
    count: int
    results: list[DrugSearchResult]

# Full API Response
class DDICheckResponse(BaseModel):
    checker_result: CheckerResult
    details: list[InteractionDetail] = []   