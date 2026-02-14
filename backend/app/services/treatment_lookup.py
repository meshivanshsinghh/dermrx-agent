import json 
import logging 
from dataclasses import dataclass

from app.config import TREATMENT_TABLE_JSON

logger = logging.getLogger(__name__)

@dataclass
class DrugCandidate:
    drug_name: str
    ddinter_name: str 
    rxcui: str 
    mesh_sources: list[str]
    smiles: str | None
    txgemma_eligible: bool
    treatment_class: str
    
class TreatmentLookupService:
    def __init__(self):
        self._table: dict = {}
        self._load()
        
    def _load(self):
        with open(TREATMENT_TABLE_JSON, "r") as f:
            data = json.load(f) 
        
        self._table = data["treatment_classes"]
        total = sum(
            len(cls_data["ddinter_verified"])
            for cls_data in self._table.values()
        )
        logger.info(
            f"Treatment table loaded: {len(self._table)} classes, "
            f"{total} verified drugs"
        )
    
    # method for clinical orrdering
    CLINICAL_PRIORITY = {
        "antifungal": ["fluconazole", "terbinafine", "clotrimazole", "ketoconazole", "miconazole"],
        "antibiotic": ["cephalexin", "doxycycline", "amoxicillin", "mupirocin"],
        "antiviral": ["acyclovir", "valacyclovir"],
        "topical_steroid": ["hydrocortisone", "betamethasone", "triamcinolone"],
        "psoriasis_treatment": ["methotrexate", "calcipotriene", "acitretin", "cyclosporine"],
        "acne_treatment": ["tretinoin", "adapalene", "isotretinoin", "doxycycline"],
        "antihistamine": ["cetirizine", "loratadine", "diphenhydramine", "hydroxyzine"],
        "antiparasitic": ["permethrin", "ivermectin"],
        "lichen_treatment": ["clobetasol", "tacrolimus"],
        "nail_treatment": ["terbinafine", "itraconazole", "ciclopirox"],
        "wart_treatment": ["salicylic acid", "imiquimod"],
    }
    
    def get_candidates_ranked(
        self,
        treatment_class: str,
        txgemma_only: bool = False,
    ) -> list[DrugCandidate]:
        candidates = self.get_candidates(treatment_class, txgemma_only)
        priority = self.CLINICAL_PRIORITY.get(treatment_class, [])

        def sort_key(c: DrugCandidate) -> int:
            name = c.drug_name.lower()
            if name in priority:
                return priority.index(name)
            return len(priority) + 1

        candidates.sort(key=sort_key)
        return candidates
    
    def get_candidates(
        self, 
        treatment_class: str, 
        txgemma_only: bool = False, 
    ) -> list[DrugCandidate]:
        
        if treatment_class not in self._table:
            logger.warning(f"Unknown treatment clas: {treatment_class}")
            return []
        
        candidates = []
        for drug in self._table[treatment_class]["ddinter_verified"]:
            if txgemma_only and not drug.get("txgemma_eligible", False):
                continue
            
            candidates.append(DrugCandidate(
                drug_name=drug["drug_name"],
                ddinter_name=drug["ddinter_name"],
                rxcui=drug["rxcui"],
                mesh_sources=drug.get("mesh_sources", []),
                smiles=drug.get("smiles"),
                txgemma_eligible=drug.get("txgemma_eligible", False),
                treatment_class=treatment_class,
            ))
        
        logger.info(
            f"[{treatment_class}] Returning {len(candidates)} candidates"
            f"{' (txgemma_only)' if txgemma_only else ''}"
        )
        
        return candidates
    
    def get_all_classes(self) -> list[str]:
        return list(self._table.keys())
    
    
    def get_drug_by_name(self, drug_name: str) -> DrugCandidate | None: 
        drug_lower = drug_name.strip().lower()
        for cls_name, cls_data in self._table.items():
            for drug in cls_data["ddinter_verified"]:
                if drug["drug_name"].lower() == drug_lower:
                    return DrugCandidate(
                        drug_name=drug["drug_name"],
                        ddinter_name=drug["ddinter_name"],
                        rxcui=drug["rxcui"],
                        mesh_sources=drug.get("mesh_sources", []),
                        smiles=drug.get("smiles"),
                        txgemma_eligible=drug.get("txgemma_eligible", False),
                        treatment_class=cls_name,
                    )
        
        return None