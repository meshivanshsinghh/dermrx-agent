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
    
# DISEASE Interaction
SEVERITY_MAP = {"3": "Major", "2": "Moderate", "1": "Minor"}

class DiseaseInteraction(BaseModel):
    interaction_id: int
    drug_id: str
    drug_name: str
    severity: str
    disease_name: str
    description: str | None = None
    reference_count: int = 0
    
# FOOD INTERACTION
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

