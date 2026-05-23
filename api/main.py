import time
import sqlite3
import os
import logging
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .schemas import (
    MedRequest,
    MedResponse,
    InteractionRequest,
    InteractionResponse,
    SearchResponse,
)
from .drug_data import fetch_drug_info, search_drug_names
from .explainer import explain_medication
from .interactions import process_interaction
from .fuzzy_match import get_matcher

logger = logging.getLogger("aybolit")
logging.basicConfig(level=logging.INFO)

# Support both new and legacy env names for transition
DB_PATH = os.environ.get("AYBOLIT_DB") or os.environ.get("DEGHATUN_DB", "./aybolit.db")
START_TIME = time.time()

limiter = Limiter(key_func=get_remote_address)


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS stats (key TEXT PRIMARY KEY, value INTEGER)"
    )
    conn.execute("INSERT OR IGNORE INTO stats VALUES ('total_queries', 0)")
    conn.execute("INSERT OR IGNORE INTO stats VALUES ('total_interactions', 0)")
    conn.commit()
    conn.close()


def increment_stat(key: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("UPDATE stats SET value = value + 1 WHERE key = ?", (key,))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"increment_stat failed for {key}: {e}")


def get_stats() -> dict:
    try:
        conn = sqlite3.connect(DB_PATH)
        rows = conn.execute("SELECT key, value FROM stats").fetchall()
        conn.close()
        return {k: v for k, v in rows}
    except Exception:
        return {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Aybolit API",
    description="Armenian Medication Intelligence Assistant",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://vahemaleryan.github.io",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_powered_by_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["x-powered-by"] = "Aybolit"
    return response


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "Aybolit",
        "groq_configured": bool(os.environ.get("GROQ_API_KEY")),
    }


@app.get("/stats")
async def stats():
    data = get_stats()
    return {
        "total_queries": data.get("total_queries", 0),
        "total_interactions": data.get("total_interactions", 0),
        "uptime_seconds": round(time.time() - START_TIME, 1),
    }


@app.get("/search", response_model=SearchResponse)
@limiter.limit("30/minute")
async def search(request: Request, q: str = ""):
    if len(q.strip()) < 2:
        return SearchResponse(suggestions=[])
    suggestions = search_drug_names(q.strip())
    return SearchResponse(suggestions=suggestions)


@app.post("/explain", response_model=MedResponse)
@limiter.limit("20/minute")
async def explain(request: Request, body: MedRequest):
    start = time.time()
    original_query = body.drug_name

    # Fuzzy-match metadata
    did_you_mean: Optional[str] = None
    matched_name: Optional[str] = None
    did_you_mean_hy: Optional[str] = None
    did_you_mean_ru: Optional[str] = None

    # 1. Always run fuzzy match first to canonicalize the user's input.
    #    This handles typos, transliteration, and brand-name variants
    #    BEFORE asking OpenFDA — because FDA's own labels sometimes contain
    #    typos that would falsely "match" a misspelled query.
    matcher = get_matcher()
    match = matcher.find_match(original_query)

    if match["found"] and match["confidence"] >= 0.75:
        matched_name = match["matched_name"]
        # Only show "did you mean" if user's normalized input differs from
        # the matched canonical name.
        norm_original = matcher.normalize(original_query)
        norm_matched = matcher.normalize(matched_name)
        if norm_original != norm_matched:
            did_you_mean = matched_name
            did_you_mean_hy = match["suggestion_text_hy"]
            did_you_mean_ru = match["suggestion_text_ru"]
        # Use the canonical OpenFDA search term
        effective_query = match["openfda_term"]
    else:
        effective_query = original_query

    # 2. Now query OpenFDA with the (possibly corrected) name
    drug_data = fetch_drug_info(effective_query)
    found = drug_data.get("found", False)

    source = "openFDA + Groq" if found else "AI knowledge only"

    # 3. Ask the AI to explain (using the effective drug name)
    explain_target = matched_name or effective_query
    try:
        ai = explain_medication(explain_target, drug_data, body.language)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("explain_medication failed")
        raise HTTPException(status_code=502, detail=f"AI explanation failed: {e}")

    elapsed = (time.time() - start) * 1000
    increment_stat("total_queries")

    return MedResponse(
        drug_name=matched_name or original_query,
        found=found,
        summary_hy=ai.get("summary_hy", ""),
        summary_ru=ai.get("summary_ru", ""),
        what_it_does=ai.get("what_it_does", ""),
        side_effects=ai.get("side_effects", []),
        dosage_guidance=ai.get("dosage_guidance", ""),
        dosage_card=ai.get("dosage_card"),
        doctor_signal=ai.get("doctor_signal", "routine"),
        doctor_reason=ai.get("doctor_reason", ""),
        safe_with_food=ai.get("safe_with_food", True),
        processing_time_ms=round(elapsed, 2),
        model=ai.get("model", "llama-3.3-70b-versatile"),
        source=source,
        did_you_mean=did_you_mean,
        did_you_mean_hy=did_you_mean_hy,
        did_you_mean_ru=did_you_mean_ru,
        matched_name=matched_name,
    )


@app.post("/interaction", response_model=InteractionResponse)
@limiter.limit("20/minute")
async def interaction(request: Request, body: InteractionRequest):
    try:
        result = process_interaction(body.drug1, body.drug2, body.language)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("process_interaction failed")
        raise HTTPException(status_code=502, detail=f"Interaction check failed: {e}")

    increment_stat("total_interactions")
    return result
