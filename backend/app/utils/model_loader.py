import os 
import logging 

logger = logging.getLogger(__name__)

MOCK_MODE = os.getenv("DERMRX_MOCK_MODE", "true").lower() == "true"

# model instances
_siglip_model = None 
_siglip_processor = None 
_medgemma_model = None 
_medgemma_tokenizer = None 
_txgemma_model = None 
_txgemma_tokenizer = None
_tdc_prompts = None

def is_mock_mode() -> bool:
    return MOCK_MODE

def load_all_models():
    if MOCK_MODE:
        logger.info("MOCK MODE enabled")
        return 
    
    _load_medsiglip()
    _load_medgemma()
    _load_txgemma()
    logger.info("All models loaded successfully")
    
def _load_medsiglip():
    global _siglip_model, _siglip_processor
    import torch
    from transformers import AutoModel, AutoProcessor
    
    _siglip_model = AutoModel.from_pretrained(
        "google/medsiglip-448",
        torch_dtype=torch.float16,
    ).to("cuda")
    _siglip_processor = AutoProcessor.from_pretrained("google/medsiglip-448")
    logger.info("MedSigLIP loaded")
    
def _load_medgemma():
    global _medgemma_model, _medgemma_tokenizer
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )
    _medgemma_model = AutoModelForCausalLM.from_pretrained(
        "google/medgemma-4b-it",
        quantization_config=bnb_config,
        device_map="auto",
    )
    _medgemma_tokenizer = AutoTokenizer.from_pretrained("google/medgemma-4b-it")
    logger.info("MedGemma loaded")
    
def _load_txgemma():
    global _txgemma_model, _txgemma_tokenizer, _tdc_prompts
    import json
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    from huggingface_hub import hf_hub_download

    bnb_config = BitsAndBytesConfig(load_in_4bit=True)
    _txgemma_model = AutoModelForCausalLM.from_pretrained(
        "google/txgemma-2b-predict",
        quantization_config=bnb_config,
        device_map="auto",
    )
    _txgemma_tokenizer = AutoTokenizer.from_pretrained("google/txgemma-2b-predict")
    prompts_path = hf_hub_download(
        repo_id="google/txgemma-2b-predict",
        filename="tdc_prompts.json",
    )
    with open(prompts_path, "r") as f:
        _tdc_prompts = json.load(f)
    
    logger.info(f"TxGemma loaded with {len(_tdc_prompts)} TDC tasks")
    

def get_siglip():
    return _siglip_model, _siglip_processor

def get_medgemma():
    return _medgemma_model, _medgemma_tokenizer

def get_txgemma():
    return _txgemma_model, _txgemma_tokenizer, _tdc_prompts