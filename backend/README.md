<h1 align="center">DermRx Agent — Backend</h1>

<p align="center">
  <em>FastAPI backend powering the agentic dermatology pipeline</em>
</p>

<p align="center">
    <img alt="Python" src="https://img.shields.io/badge/python-3.10+-blue?style=for-the-badge&logo=python&logoColor=white">
    <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white">
    <img alt="PyTorch" src="https://img.shields.io/badge/PyTorch-2.6-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white">
</p>

---

## Overview

The backend runs a **multi-step agentic pipeline** that orchestrates three AI models and external data sources to deliver a complete clinical decision-support analysis from a single skin image.

### Pipeline Flow

```
Image Upload
    │
    ▼
MedSigLIP (google/medsiglip-448)
    │  Zero-shot classification across 22 skin categories
    │  Outputs: predicted condition, confidence, tier, safety flags
    ▼
Treatment Lookup (MED-RT + PubChem curated table)
    │  Maps condition → ranked drug candidates with SMILES
    ▼
┌───────────────────┬──────────────────────┐
│  DDInter 2.0      │  TxGemma 2B          │
│  Drug-drug,       │  6 toxicity tasks:   │
│  drug-food,       │  Skin Reaction, DILI,│
│  drug-disease     │  CYP2C9, CYP3A4,    │
│  interactions     │  hERG, ClinTox       │
└───────┬───────────┴──────────┬───────────┘
        │                      │
        ▼                      ▼
      Agentic Drug Selection Loop
        │  Evaluates candidates until a safe drug is found
        │  or all are exhausted
        ▼
MedGemma 4B-IT (google/medgemma-4b-it)
    │  Synthesizes structured clinical report
    │  Also powers the follow-up chat
    ▼
JSON Response → Frontend
```

---

## Setup

### Mock Mode (no GPU)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The server starts in mock mode by default (`DERMRX_MOCK_MODE=true`), returning realistic pre-computed responses without loading any ML models.

### GPU Mode (CUDA 12.4)

Requires an NVIDIA GPU with **24GB+ VRAM** (tested on A10G).

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-gpu.txt
huggingface-cli login

export DERMRX_MOCK_MODE=false
uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

All three models are loaded into VRAM at startup (~18GB total with 4-bit quantization).

---

## API Reference

### `GET /api/health`

Health check. Returns GPU status and loaded models.

### `POST /api/analyze`

Full agentic pipeline. Accepts multipart form data.

| Field | Type | Description |
|-------|------|-------------|
| `image` | file | Skin image (JPEG/PNG) |
| `patient_medications` | string | Comma-separated medication names |

### `POST /api/drug-check`

Standalone drug safety check. Accepts JSON.

```json
{
  "drug_name": "fluconazole",
  "patient_medications": ["warfarin", "metformin"]
}
```

### `GET /api/ddi/check-by-name?drugs=Drug1,Drug2,...`

Direct drug-drug interaction lookup via DDInter 2.0.

### `POST /api/chat`

Context-aware clinical chat. Requires a prior analysis session.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DERMRX_MOCK_MODE` | `true` | Set to `false` to load real models |
| `DERMRX_EXTRA_ORIGINS` | — | Additional CORS origins (comma-separated) |
