from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DRUG_LOOKUP_CSV = DATA_DIR / "ddinter_drug_lookup.csv"
TREATMENT_TABLE_JSON = DATA_DIR / "dermrx_treatment_table_v3.json"
CLASSIFICATION_CONFIG_JSON = DATA_DIR / "dermrx_config_final.json"

# DDInter 2.0 Scraper
DDINTER2_BASE_URL = "https://ddinter2.scbdd.com"
DDINTER2_CHECKER_URL = f"{DDINTER2_BASE_URL}/checker/result"
DDINTER2_MAX_DRUGS_PER_URL = 5
DDINTER2_REQUEST_DELAY = 0.5
DDINTER2_CACHE_TTL = 86400

API_PREFIX = "/api"
APP_TITLE = "DermRx Agent API"
APP_VERSION = "0.1.0"

import os as _os
_extra = [o.strip() for o in _os.getenv("DERMRX_EXTRA_ORIGINS", "").split(",") if o.strip()]

CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://dermrx-agent.vercel.app",
    *_extra,
]

# Regex to match all Vercel preview deployment URLs
CORS_ORIGIN_REGEX = r"https://dermrx-agent(-[a-z0-9]+)*-shivansh-singhs-projects(-[a-z0-9]+)*\.vercel\.app"