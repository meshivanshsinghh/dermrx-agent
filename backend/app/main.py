import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import APP_TITLE, APP_VERSION, CORS_ORIGINS, CORS_ORIGIN_REGEX
from app.routers import health, ddi, analyze, chat
from contextlib import asynccontextmanager
from app.utils.model_loader import load_all_models


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_all_models()
    yield

app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(ddi.router)
app.include_router(analyze.router)
app.include_router(chat.router)

@app.get("/")
def root():
    return {"message": "DermRx Agent API", "version": APP_VERSION}