import logging 
from dataclasses import dataclass, field
from PIL import Image

from app.config import CLASSIFICATION_CONFIG_JSON
from app.utils.model_loader import is_mock_mode, get_siglip

import json

logger = logging.getLogger(__name__)

@dataclass
class SafetyFlag: 
    category: str 
    display_name: str 
    confidence: str 
    urgency: str 
    referral: str
    
@dataclass
class ClassificationResult:
    predicted_category: str 
    display_name: str 
    tier: int 
    confidence: float
    confidence_level: str 
    
    
    # Tier 1 specific 
    treatment_class: str | None = None 
    
    # Tier 2 specific
    urgency: str | None = None 
    referral: str | None = None 
    
    # Tier 3 specific 
    reason: str | None = None 
    
    safety_flags: list[SafetyFlag] = field(default_factory=list)
    top_scores: list[dict] = field(default_factory=list)
    

class ClassifierService: 
    def __init__(self):
        self._config: dict = {}
        self._categories: dict = {}
        self._prompts: list[str] = []
        self._confidence_thresholds: dict = {}
        self._prompt_to_category: dict[str, str] = {}
        self._load_config()
        
    def _load_config(self):
        with open(CLASSIFICATION_CONFIG_JSON, "r") as f:
            self._config = json.load(f)
        
        self._categories = self._config["clinical_categories"]
        self._prompts = self._config["prompts"]
        self._confidence_thresholds = self._config["confidence_config"]
        
        logger.info(
            f"Classifier config loaded: {len(self._categories)} categories, "
            f"{len(self._prompts)} prompts"
        )
        
    def classify(self, image: Image.Image) -> ClassificationResult:
        if is_mock_mode():
            return self._mock_classify()
        
        return self._real_classify(image)
    

    def _real_classify(self, image: Image.Image) -> ClassificationResult:
        import torch 
        
        model, processor = get_siglip()
        
        # running MedSigLIP across 76 prompts
        inputs = processor(
            text=self._prompts,
            images=[image],
            padding="max_length",
            return_tensors="pt",
        ).to(model.device)
        
        with torch.no_grad():
            outputs = model(**inputs)
        
        logits = outputs.logits_per_image[0]
        probs = torch.softmax(logits, dim=0).cpu().numpy()

        # aggregate probabilities by clinical category
        category_scores: dict[str, float] = {}
        for i, prompt in enumerate(self._prompts):
            cat_name = self._prompt_to_category[prompt]
            category_scores[cat_name] = (
                category_scores.get(cat_name, 0.0) + float(probs[i])
            )

        return self._build_result(category_scores)
        
    
    def _build_result(self, category_scores: dict[str, float]) -> ClassificationResult:
        high_thresh = self._confidence_thresholds["high_confidence_threshold"]
        mod_thresh = self._confidence_thresholds["moderate_confidence_threshold"]
        safety_thresh = self._confidence_thresholds["tier2_safety_threshold"]

        # sort categories by score
        sorted_cats = sorted(
            category_scores.items(), key=lambda x: x[1], reverse=True
        )

        # top prediction
        top_cat_name, top_score = sorted_cats[0]
        top_cat = self._categories[top_cat_name]

        # confidence level
        if top_score >= high_thresh:
            confidence_level = "HIGH"
        elif top_score >= mod_thresh:
            confidence_level = "MODERATE"
        else:
            confidence_level = "LOW"

        # safety flag scan: check ALL Tier 2 categories
        safety_flags = []
        for cat_name, score in category_scores.items():
            cat = self._categories[cat_name]
            if cat["tier"] == 2 and score >= safety_thresh:
                safety_flags.append(SafetyFlag(
                    category=cat_name,
                    display_name=cat["display_name"],
                    confidence=round(score, 4),
                    urgency=cat.get("urgency", "routine"),
                    referral=cat.get("referral", "dermatology"),
                ))

        # top 5 for reasoning trace
        top_scores = [
            {
                "category": name,
                "display_name": self._categories[name]["display_name"],
                "score": round(score, 4),
                "tier": self._categories[name]["tier"],
            }
            for name, score in sorted_cats[:5]
        ]

        return ClassificationResult(
            predicted_category=top_cat_name,
            display_name=top_cat["display_name"],
            tier=top_cat["tier"],
            confidence=round(top_score, 4),
            confidence_level=confidence_level,
            treatment_class=top_cat.get("treatment_class"),
            urgency=top_cat.get("urgency"),
            referral=top_cat.get("referral"),
            reason=top_cat.get("reason"),
            safety_flags=safety_flags,
            top_scores=top_scores,
        )
    
    def _mock_classify(self) -> ClassificationResult:
        mock_scores = {
            "fungal infection": 0.42,
            "eczema dermatitis": 0.11,
            "psoriasis": 0.08,
            "bacterial infection": 0.07,
            "parasitic infestation": 0.05,
            "acne rosacea": 0.04,
            "urticaria": 0.03,
            "melanoma": 0.03,
            "skin cancer non melanoma": 0.02,
            "warts": 0.02,
            "lichen planus": 0.02,
            "herpes viral infection": 0.02,
            "nail disorder": 0.01,
            "benign skin growth": 0.01,
            "pigmented lesion": 0.01,
            "vascular lesion": 0.01,
            "alopecia": 0.01,
            "autoimmune skin disease": 0.01,
            "bullous disease": 0.01,
            "drug reaction": 0.01,
            "systemic disease": 0.01,
            "photodamage pigmentation": 0.01,
        }

        return self._build_result(mock_scores)