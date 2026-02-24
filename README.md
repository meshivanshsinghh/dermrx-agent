<p align="center">
  <img src="https://img.icons8.com/fluency/96/pill.png" width="80" height="80" alt="DermRx Agent Logo"/>
  <br/>
  <br/>
</p>

<h1 align="center">DermRx Agent</h1>

<p align="center">
  <em>AI-powered dermatology diagnosis and drug safety agent</em>
</p>

<p align="center">
    <a href="https://dermrx-agent.vercel.app"><img alt="Live Demo" src="https://img.shields.io/badge/demo-live-brightgreen?style=for-the-badge"></a>
    <a href="https://github.com/meshivanshsinghh/dermrx-agent/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/meshivanshsinghh/dermrx-agent?style=for-the-badge&color=blue"></a>
    <a href="https://github.com/meshivanshsinghh/dermrx-agent"><img alt="GitHub Stars" src="https://img.shields.io/github/stars/meshivanshsinghh/dermrx-agent?style=for-the-badge"></a>
</p>

<h3 align="center">
    <p>Skin diagnosis → Treatment lookup → Drug safety checks → Clinical report — all in one agentic pipeline.</p>
</h3>

---

## What is DermRx Agent?

DermRx Agent is an **agentic clinical decision-support tool** for dermatology. Upload a skin image and list a patient's current medications — the system automatically:

1. **Classifies** the skin condition using [MedSigLIP](https://huggingface.co/google/medsiglip-448) (zero-shot, 22 dermatological categories)
2. **Looks up** evidence-based treatments via a curated drug table sourced from [MED-RT](https://www.nlm.nih.gov/research/umls/sourcereleasedocs/current/MED-RT/) and [PubChem](https://pubchem.ncbi.nlm.nih.gov/)
3. **Checks drug-drug interactions** in real-time against [DDInter 2.0](https://ddinter2.scbdd.com/) (1.2M+ interactions)
4. **Predicts molecular toxicity** with [TxGemma 2B](https://huggingface.co/google/txgemma-2b-predict) across 6 safety endpoints (hERG, DILI, CYP inhibition, etc.)
5. **Synthesizes a clinical report** via [MedGemma 4B](https://huggingface.co/google/medgemma-4b-it) — summarizing findings with reasoning traces
6. **Provides a follow-up chat** powered by MedGemma with full context of the analysis

<br>

> **Disclaimer:** This is a research prototype. It is **not** a substitute for professional medical advice, diagnosis, or treatment.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| **Backend** | FastAPI, Uvicorn, Pydantic |
| **AI Models** | MedSigLIP (classification), MedGemma 4B-IT (synthesis + chat), TxGemma 2B (toxicity) |
| **Data Sources** | DDInter 2.0 (drug interactions), MED-RT (treatments), PubChem (SMILES/molecular data) |
| **Deployment** | Vercel (frontend), AWS EC2 g5.xlarge (backend, NVIDIA A10G GPU) |

---

## Quickstart

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **HuggingFace account** with access to [google/medgemma-4b-it](https://huggingface.co/google/medgemma-4b-it), [google/txgemma-2b-predict](https://huggingface.co/google/txgemma-2b-predict), [google/medsiglip-448](https://huggingface.co/google/medsiglip-448)
- **NVIDIA GPU** with 24GB+ VRAM (for full mode) — or run in **mock mode** without a GPU

### 1. Clone the repo

```bash
git clone https://github.com/meshivanshsinghh/dermrx-agent.git
cd dermrx-agent
```

### 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate

# CPU / Mock mode (no GPU required)
pip install -r requirements.txt

# GPU mode (CUDA 12.4)
pip install -r requirements-gpu.txt

# Start the server  
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

By default, the backend starts in **mock mode** (`DERMRX_MOCK_MODE=true`). To use real models:

```bash
export DERMRX_MOCK_MODE=false
uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

### 3. Frontend

```bash
cd dermrx-frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Demo Mode:** If the frontend cannot reach the backend, it automatically falls back to a built-in demo mode using pre-captured analysis data.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check + GPU status |
| `POST` | `/api/analyze` | Full pipeline: image → diagnosis → drug safety → report |
| `POST` | `/api/drug-check` | Standalone drug safety evaluation |
| `GET` | `/api/ddi/check-by-name` | Drug-drug interaction check by drug names |
| `POST` | `/api/chat` | Context-aware clinical chat (MedGemma) |

A [Postman collection](./DermRx%20Agent.postman_collection.json) is included for testing.

---

## GPU Deployment (AWS EC2)

For deploying on an **EC2 g5.xlarge** instance (NVIDIA A10G, 24GB VRAM):

```bash
# 1. SSH into your instance and clone the repo
git clone https://github.com/meshivanshsinghh/dermrx-agent.git

# 2. Run the one-time setup (installs deps, downloads models)
bash ~/dermrx-agent/deploy/setup_ec2.sh

# 3. Start the server
bash ~/dermrx-agent/deploy/start_server.sh
```

The setup script handles Python environment creation, PyTorch CUDA installation, HuggingFace authentication, and model downloads (~10GB total).

---

## Research Notebooks

| Notebook | Description |
|----------|-------------|
| **N1** — Skin Diagnosis | Zero-shot classification with MedSigLIP across 22 dermatological categories |
| **N2** — Drug Safety DB | Building the treatment lookup table from MED-RT, PubChem, and DDInter 2.0 |
| **N3** — AI Intelligence | TxGemma toxicity prediction and MedGemma clinical synthesis |
| **N4** — Full Pipeline | End-to-end agentic demo combining all components |

---

## License

See the [LICENSE](./LICENSE) file for details.
