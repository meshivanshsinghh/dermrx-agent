import logging
from dataclasses import dataclass

from app.utils.model_loader import is_mock_mode, get_txgemma

logger = logging.getLogger(__name__)


# The 6 TxGemma tasks we run for each drug
TOXICITY_TASKS = {
    "Skin_Reaction": {
        "safe": "(A)",
        "flag": "(B)",
        "label_safe": "No skin reaction predicted",
        "label_flag": "Skin reaction risk (photosensitivity/sensitization)",
    },
    "DILI": {
        "safe": "(A)",
        "flag": "(B)",
        "label_safe": "Low hepatotoxicity risk",
        "label_flag": "Hepatotoxicity risk (drug-induced liver injury)",
    },
    "CYP2C9_Veith": {
        "safe": "(A)",
        "flag": "(B)",
        "label_safe": "Does not inhibit CYP2C9",
        "label_flag": "CYP2C9 inhibitor (warfarin metabolism affected)",
    },
    "CYP3A4_Veith": {
        "safe": "(A)",
        "flag": "(B)",
        "label_safe": "Does not inhibit CYP3A4",
        "label_flag": "CYP3A4 inhibitor (major drug metabolism pathway)",
    },
    "hERG": {
        "safe": "(A)",
        "flag": "(B)",
        "label_safe": "No hERG blockade predicted",
        "label_flag": "hERG blocker (cardiotoxicity/QT prolongation risk)",
    },
    "ClinTox": {
        "safe": "(A)",
        "flag": "(B)",
        "label_safe": "No clinical toxicity signal",
        "label_flag": "Clinical toxicity signal detected",
    },
}


@dataclass 
class ToxicityPrediction: 
    task: str 
    raw_output: str 
    is_flagged: bool 
    label: str 
    

@dataclass
class ToxicityProfile: 
    drug_name: str 
    smiles: str 
    predictions: list[ToxicityPrediction]
    flagged_count: int 
    summary: str 
    
class ToxicityService:
    def __init__(self):
        logger.info("ToxicityService initialized")

    def predict(self, drug_name: str, smiles: str) -> ToxicityProfile:
        if is_mock_mode():
            return self._mock_predict(drug_name, smiles)

        return self._real_predict(drug_name, smiles)

    def _real_predict(self, drug_name: str, smiles: str) -> ToxicityProfile:
        model, tokenizer, tdc_prompts = get_txgemma()

        predictions = []
        for task_name, task_info in TOXICITY_TASKS.items():
            prompt = tdc_prompts[task_name].replace("{Drug SMILES}", smiles)
            import torch
            input_ids = tokenizer(prompt, return_tensors="pt").to(model.device)
            with torch.no_grad():
                outputs = model.generate(**input_ids, max_new_tokens=8)
            response = tokenizer.decode(
                outputs[0][len(input_ids["input_ids"][0]):],
                skip_special_tokens=True,
            ).strip()

            # Free intermediate tensors per-task
            del input_ids, outputs
            torch.cuda.empty_cache() if torch.cuda.is_available() else None

            # parse: look for A or B in the response
            is_flagged = "B" in response
            label = task_info["label_flag"] if is_flagged else task_info["label_safe"]

            logger.info(f"TxGemma [{drug_name}] {task_name}: raw='{response}' flagged={is_flagged} → {label}")

            predictions.append(ToxicityPrediction(
                task=task_name,
                raw_output=response,
                is_flagged=is_flagged,
                label=label,
            ))

        flagged = [p for p in predictions if p.is_flagged]
        if flagged:
            flag_names = [p.task for p in flagged]
            summary = f"{drug_name}: {len(flagged)} flags ({', '.join(flag_names)})"
        else:
            summary = f"{drug_name}: clean toxicity profile"

        return ToxicityProfile(
            drug_name=drug_name,
            smiles=smiles,
            predictions=predictions,
            flagged_count=len(flagged),
            summary=summary,
        )

    def _mock_predict(self, drug_name: str, smiles: str) -> ToxicityProfile:
        logger.info(f"MOCK: TxGemma predictions for {drug_name}")

        mock_data = {
            "fluconazole": {
                "Skin_Reaction": "(B)", "DILI": "(B)",
                "CYP2C9_Veith": "(A)", "CYP3A4_Veith": "(A)",
                "hERG": "(A)", "ClinTox": "(A)",
            },
            "terbinafine": {
                "Skin_Reaction": "(B)", "DILI": "(B)",
                "CYP2C9_Veith": "(A)", "CYP3A4_Veith": "(A)",
                "hERG": "(B)", "ClinTox": "(A)",
            },
            "clotrimazole": {
                "Skin_Reaction": "(B)", "DILI": "(B)",
                "CYP2C9_Veith": "(A)", "CYP3A4_Veith": "(B)",
                "hERG": "(B)", "ClinTox": "(A)",
            },
            "ketoconazole": {
                "Skin_Reaction": "(B)", "DILI": "(B)",
                "CYP2C9_Veith": "(B)", "CYP3A4_Veith": "(B)",
                "hERG": "(B)", "ClinTox": "(A)",
            },
            "isotretinoin": {
                "Skin_Reaction": "(B)", "DILI": "(B)",
                "CYP2C9_Veith": "(B)", "CYP3A4_Veith": "(A)",
                "hERG": "(B)", "ClinTox": "(A)",
            },
            "hydrocortisone": {
                "Skin_Reaction": "(B)", "DILI": "(A)",
                "CYP2C9_Veith": "(A)", "CYP3A4_Veith": "(A)",
                "hERG": "(B)", "ClinTox": "(A)",
            },
            "methotrexate": {
                "Skin_Reaction": "(A)", "DILI": "(B)",
                "CYP2C9_Veith": "(A)", "CYP3A4_Veith": "(A)",
                "hERG": "(B)", "ClinTox": "(A)",
            },
        }

        default = {
            "Skin_Reaction": "(B)", "DILI": "(B)",
            "CYP2C9_Veith": "(A)", "CYP3A4_Veith": "(A)",
            "hERG": "(A)", "ClinTox": "(A)",
        }

        drug_results = mock_data.get(drug_name.lower(), default)

        predictions = []
        for task_name, task_info in TOXICITY_TASKS.items():
            raw = drug_results[task_name]
            is_flagged = "B" in raw
            label = task_info["label_flag"] if is_flagged else task_info["label_safe"]
            predictions.append(ToxicityPrediction(
                task=task_name,
                raw_output=raw,
                is_flagged=is_flagged,
                label=label,
            ))

        flagged = [p for p in predictions if p.is_flagged]
        if flagged:
            flag_names = [p.task for p in flagged]
            summary = f"{drug_name}: {len(flagged)} flags ({', '.join(flag_names)})"
        else:
            summary = f"{drug_name}: clean toxicity profile"

        return ToxicityProfile(
            drug_name=drug_name,
            smiles=smiles,
            predictions=predictions,
            flagged_count=len(flagged),
            summary=summary,
        )