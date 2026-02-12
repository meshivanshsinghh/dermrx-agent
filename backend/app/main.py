import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import APP_TITLE, APP_VERSION, CORS_ORIGINS
from app.routers import health, ddi
from contextlib import asynccontextmanager
from app.utils.model_loader import load_all_models


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(ddi.router)


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_all_models()
    yield

@app.get("/")
def root():
    return {"message": "DermRx Agent API", "version": APP_VERSION}