from fastapi import APIRouter
from app.utils.model_loader import is_mock_mode, get_siglip, get_medgemma, get_txgemma, clear_cuda_cache

router = APIRouter(prefix="/api", tags=["Health"])


@router.get("/health")
def health_check():
    mock = is_mock_mode()

    if mock:
        models_loaded = {
            "medsiglip": True,
            "txgemma": True,
            "medgemma": True,
        }
    else:
        siglip_model, siglip_proc = get_siglip()
        medgemma_model, medgemma_tok = get_medgemma()
        txgemma_model, txgemma_tok, tdc = get_txgemma()
        models_loaded = {
            "medsiglip": siglip_model is not None and siglip_proc is not None,
            "txgemma": txgemma_model is not None and txgemma_tok is not None,
            "medgemma": medgemma_model is not None and medgemma_tok is not None,
        }

    all_ready = all(models_loaded.values())

    return {
        "status": "ok" if all_ready else "loading",
        "service": "DermRx Agent API",
        "mock_mode": mock,
        "models_loaded": models_loaded,
    }


@router.post("/clear-cache")
def clear_cache():
    """Clear CUDA cache between analyses without unloading models."""
    mem = clear_cuda_cache()
    return {
        "status": "ok",
        "message": "CUDA cache cleared",
        "memory": mem,
    }