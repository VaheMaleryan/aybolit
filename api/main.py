import time
import sqlite3
import os
import logging
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, UploadFile, File
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
    OCRResponse,
)
from .drug_data import fetch_drug_info, search_drug_names
from .explainer import explain_medication
from .interactions import process_interaction
from .fuzzy_match import get_matcher
from .rag import MedicationRAG
from .ocr import MedicationOCR

logger = logging.getLogger("aybolit")
logging.basicConfig(level=logging.INFO)

# Support both new and legacy env names for transition
DB_PATH = os.environ.get("AYBOLIT_DB") or os.environ.get("DEGHATUN_DB", "./aybolit.db")
START_TIME = time.time()

# AYBOLIT_LOCAL=true enables persistent RAG + Tesseract OCR. Cloud
# (Railway) keeps it off so ChromaDB is in-memory and OCR uses Groq.
LOCAL_MODE = os.environ.get("AYBOLIT_LOCAL", "false").lower() == "true"

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
    # Initialize RAG (downloads embedding model on first run — can take
    # ~30s the very first time, cached afterwards)
    try:
        logger.info(f"Initializing RAG (local_mode={LOCAL_MODE})…")
        app.state.rag = MedicationRAG(persist_local=LOCAL_MODE)
        logger.info(f"RAG ready: {app.state.rag.get_stats()}")
    except Exception as e:
        logger.exception("RAG initialization failed — explain will run without grounding")
        app.state.rag = None
    # OCR is cheap to construct
    app.state.ocr = MedicationOCR()
    logger.info(f"OCR backend: {app.state.ocr.backend}")
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
    rag = getattr(app.state, "rag", None)
    return {
        "status": "ok",
        "service": "Aybolit",
        "groq_configured": bool(os.environ.get("GROQ_API_KEY")),
        "rag_ready": rag is not None,
        "ocr_backend": app.state.ocr.backend if hasattr(app.state, "ocr") else None,
        "local_mode": LOCAL_MODE,
    }


@app.get("/stats")
async def stats():
    data = get_stats()
    rag = getattr(app.state, "rag", None)
    rag_stats = rag.get_stats() if rag else {"total_chunks": 0, "mode": "disabled"}
    return {
        "total_queries": data.get("total_queries", 0),
        "total_interactions": data.get("total_interactions", 0),
        "uptime_seconds": round(time.time() - START_TIME, 1),
        "rag_chunks": rag_stats.get("total_chunks", 0),
        "rag_mode": rag_stats.get("mode", "disabled"),
        "ocr_backend": app.state.ocr.backend if hasattr(app.state, "ocr") else None,
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

    # ── 3-layer detection: Tier1 → OpenFDA dynamic → Not found ──
    matcher = get_matcher()
    match = matcher.find_match(original_query)

    did_you_mean: Optional[str] = None
    did_you_mean_hy: Optional[str] = None
    did_you_mean_ru: Optional[str] = None
    matched_name: Optional[str] = None
    category: Optional[str] = None
    match_source: str = match["match_source"]

    if match["found"]:
        matched_name = match["canonical_name"]
        category = match.get("category")
        if match.get("did_you_mean"):
            did_you_mean = match["did_you_mean"]
            did_you_mean_hy = match["suggestion_hy"]
            did_you_mean_ru = match["suggestion_ru"]

    if match["found"] and match_source in ("tier1_exact", "tier1_fuzzy"):
        # Tier-1 hit — use the curated openFDA term
        effective_query = match["openfda_term"]
        drug_data = fetch_drug_info(effective_query)
        found = drug_data.get("found", False)
    elif match["found"] and match_source == "openfda_dynamic":
        # The matcher already did the OpenFDA lookup. Re-fetch the data
        # using the openfda_term it surfaced so we get full label info.
        effective_query = match["openfda_term"] or original_query
        drug_data = fetch_drug_info(effective_query)
        found = drug_data.get("found", False)
    else:
        # No catalog hit, no OpenFDA hit — let the AI try with the raw input
        effective_query = original_query
        drug_data = fetch_drug_info(original_query)
        found = drug_data.get("found", False)

    if found:
        source = "openFDA + Groq" if match_source != "openfda_dynamic" else "openFDA dynamic + Groq"
    else:
        source = "AI knowledge only"

    explain_target = matched_name or effective_query
    try:
        ai = explain_medication(
            explain_target,
            drug_data,
            body.language,
            rag=getattr(app.state, "rag", None),
        )
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
        medication_type=ai.get("medication_type"),
        side_effects=ai.get("side_effects", []),
        dosage_guidance=ai.get("dosage_guidance", ""),
        dosage_card=ai.get("dosage_card"),
        doctor_signal=ai.get("doctor_signal", "routine"),
        doctor_reason=ai.get("doctor_reason", ""),
        safe_with_food=ai.get("safe_with_food", True),
        requires_prescription=ai.get("requires_prescription"),
        controlled_substance=ai.get("controlled_substance"),
        processing_time_ms=round(elapsed, 2),
        model=ai.get("model", "llama-3.3-70b-versatile"),
        source=source,
        did_you_mean=did_you_mean,
        did_you_mean_hy=did_you_mean_hy,
        did_you_mean_ru=did_you_mean_ru,
        matched_name=matched_name,
        match_source=match_source,
        category=category,
        citations=ai.get("citations", []),
        rag_used=ai.get("rag_used", False),
    )


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


@app.post("/ocr", response_model=OCRResponse, tags=["ocr"])
@limiter.limit("10/minute")
async def ocr_medicine(request: Request, file: UploadFile = File(...)):
    """Upload a photo of a medicine box, prescription, or leaflet.
    Returns structured medication data plus an `auto_search` field the
    frontend can use to immediately re-run /explain on the detected drug.
    """
    # Validate content type early
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type. Use JPEG, PNG, or WEBP."
        )

    image_bytes = await file.read()
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="File too large — max 5MB")
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    ocr = app.state.ocr
    try:
        result = ocr.extract_from_image(image_bytes, file.content_type)
    except Exception as e:
        logger.exception("OCR failed")
        raise HTTPException(status_code=502, detail=f"OCR failed: {e}")

    return OCRResponse(
        **result,
        ocr_backend=ocr.backend,
        auto_search=result.get("drug_name") if result.get("found") else None,
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
