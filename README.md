# Aybolit · Այбoлit

**Your friendly Armenian medication assistant — named after the beloved Soviet cartoon doctor**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue)](https://vahemaleryan.github.io/aybolit)
[![API Docs](https://img.shields.io/badge/API-FastAPI%20Docs-green)](https://aybolit-api.up.railway.app/docs)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)
[![Languages](https://img.shields.io/badge/languages-Armenian%20%7C%20Russian%20%7C%20English-orange)]()

---

## The Problem

Armenian patients regularly receive medications with instructions written in Russian or dense medical jargon. Most patients cannot fully understand what a drug does, how to take it correctly, or what warning signs to watch for. Pharmacists are overworked and rarely have time to explain. This gap leads to dangerous misuse, missed doses, and unreported side effects.

No Armenian-language medication explainer existed — until now.

---

## What Aybolit Does

- **Type any medication name** in Armenian, Russian, or English — typos, brand names, Cyrillic, and mixed scripts all handled
- **Get a plain-language explanation** in both Armenian and Russian simultaneously
- **Check if two medications interact safely** — with severity rating and bilingual explanation
- **Know when to call your doctor** — with a clear signal: Routine / Monitor / Call doctor / Emergency
- **Scan a medicine box** — upload a photo and Aybolit reads the label automatically (Phase 3 — Scan tab)
- Side effects shown as color-coded pills (mild / moderate / severe)
- Every answer is **grounded in real OpenFDA data** via a vector RAG layer — citations are shown in the response

> **For best results, run locally** (see [Local Setup](#local-setup-better-quality)). Tesseract OCR with Armenian + Russian language packs is significantly more accurate than the cloud vision model on Cyrillic and Armenian text, and persistent ChromaDB lets the RAG cache grow over time.

---

## Demo Examples

### Example 1 — English input → Armenian + Russian output

**Input:** `Amoxicillin`

**Armenian (summary_hy):**
> Ամoxicillin-ը հակabiotik е, vorы oqtagortsac է baктериalakan varkutyunneri dem, aynnpisi shunchitak, parankevorum yev djayner:

**Russian (summary_ru):**
> Амоксициллин — антибиотик, который борется с бактериальными инфекциями: ушными инфекциями, ангиной и пневмонией.

**Doctor signal:** `monitor` — Take full course even if you feel better

---

### Example 2 — Russian input → Armenian output

**Input:** `Парацетамол` (language: `hy`)

**What it does:** Reduces fever and relieves mild to moderate pain

**Armenian explanation:**
> Парасетамол-ը (ацетаминофен) tsavazrakum e djermutyan yev batkem mjiayin tsavere:

**Doctor signal:** `routine` — Common OTC medication, safe when used as directed

---

### Example 3 — Drug interaction check

**Input:** `Aspirin` + `Warfarin`

**Verdict:** 🔴 `dangerous`

**Armenian:** Aspirin yev Warfarin-i mijavsorum karog e zkayatsel aryan mecanelutyan vtangavorutyan avdzelacum.

**Russian:** Сочетание аспирина и варфарина значительно увеличивает риск кровотечения. Это опасная комбинация.

**Recommendation:** Do not take these together without direct supervision from your doctor.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| Frontend | React + Vite + Tailwind CSS |
| AI | Groq API — llama-3.3-70b-versatile |
| RAG | ChromaDB + sentence-transformers (multilingual-MiniLM-L12-v2) |
| OCR (cloud) | Groq Vision (llama-4-scout) |
| OCR (local) | Tesseract (hye + rus + eng) |
| Fuzzy matching | rapidfuzz + transliterate |
| Drug data | OpenFDA API (free, no key) |
| Interactions | RxNorm API (free, no key) |
| Backend hosting | Railway |
| Frontend hosting | GitHub Pages |

---

## RAG System

Aybolit uses **Retrieval-Augmented Generation** to ground responses in verified OpenFDA label data instead of relying on the LLM's training knowledge alone.

- **Embedding model:** `paraphrase-multilingual-MiniLM-L12-v2` (supports Armenian, Russian, English natively; ~120 MB; runs locally — no embedding API calls)
- **Vector DB:** ChromaDB — ephemeral in cloud mode (rebuilt on startup), persistent on disk in local mode
- **Chunking:** OpenFDA label split by section (purpose, dosage, warnings, side_effects, interactions, contraindications, pregnancy, indications), then into overlapping ~300-char windows (50 words, 8-word overlap)
- **At explain-time:** 3 query vectors are issued for dosage, safety, and interactions; the top 6 deduped chunks become "VERIFIED MEDICAL DATA" in the prompt
- **Every response carries `citations`** like `["OpenFDA — dosage", "OpenFDA — warnings", …]` and a `rag_used: true` flag

## Medicine Scanner (OCR)

Upload a photo of any medicine box, prescription, or leaflet. Two backends with identical API contract:

- **Cloud (default):** Groq Vision (llama-4-scout) — no extra system deps; works on Railway free tier
- **Local:** Tesseract OCR with Armenian + Russian + English language packs — higher accuracy on Cyrillic/Armenian labels, fully offline once installed

The OCR result includes `drug_name`, `dosage_strength`, `dosage_form`, `manufacturer`, `warnings_text`, and a one-click "Explain this medication" button that hands the detected name to the Explain tab.

---

## Quick Start

```bash
git clone https://github.com/VaheMaleryan/aybolit.git
cd aybolit

# Backend (cloud-mode defaults: ephemeral RAG, Groq vision OCR)
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export GROQ_API_KEY=your_key_here
uvicorn api.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev   # → http://localhost:5173/aybolit/
```

### Deploy frontend to GitHub Pages

```bash
cd frontend
npm run build
npm run deploy
```

---

## Local Setup (Better Quality)

For best results — accurate Armenian + Russian OCR, persistent RAG cache that grows over time — run in **local mode**:

```bash
# 1. Install Tesseract with Armenian + Russian language packs
brew install tesseract tesseract-lang   # macOS
# or: sudo apt-get install tesseract-ocr tesseract-ocr-hye tesseract-ocr-rus

# 2. Verify language packs are present
tesseract --list-langs | grep -E "hye|rus|eng"

# 3. Install Python deps (same requirements.txt — already includes
#    pytesseract, pillow, chromadb, sentence-transformers)
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 4. Run with local mode enabled
export GROQ_API_KEY="your-key"
export AYBOLIT_LOCAL="true"
uvicorn api.main:app --port 8000
```

Local mode enables:
- **Persistent ChromaDB** at `/tmp/aybolit_chroma` (override with `AYBOLIT_CHROMA_PATH`) — RAG cache survives restarts
- **Tesseract OCR** for `/ocr` instead of Groq Vision — much better on Cyrillic / Armenian medicine labels, fully offline

---

## API Reference

### `POST /explain`

```json
{
  "drug_name": "Amoxicillin",
  "language": "hy"
}
```

Returns full medication explanation with bilingual summaries, side effects, dosage, and doctor signal.

### `POST /interaction`

```json
{
  "drug1": "Aspirin",
  "drug2": "Warfarin",
  "language": "hy"
}
```

Returns interaction verdict: `safe` | `caution` | `dangerous` with bilingual explanation.

### `GET /search?q={query}`

Returns up to 5 autocomplete suggestions from OpenFDA.

### `GET /health`

Health check.

### `GET /stats`

Total queries, total interaction checks, uptime, RAG chunk count and mode, OCR backend.

### `POST /ocr`

Multipart form upload (`file=…`). JPEG / PNG / WEBP, max 5 MB.

Returns:
```json
{
  "found": true,
  "drug_name": "Aspirin",
  "dosage_strength": "500 mg",
  "dosage_form": "tablet",
  "manufacturer": "Bayer",
  "active_ingredient": "Aspirin",
  "warnings_text": ["…"],
  "instructions_text": "…",
  "language_detected": "en",
  "ocr_backend": "groq_vision",
  "auto_search": "Aspirin"
}
```

The `auto_search` field lets the frontend immediately re-run `/explain` on the detected drug.

---

## Railway Deployment (Backend)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Select `VaheMaleryan/aybolit`
4. Set environment variables:
   - `GROQ_API_KEY` → your Groq API key
   - `AYBOLIT_DB` → `/tmp/aybolit.db`
   - (Optional) `GROQ_VISION_MODEL` → override the default vision model
5. Railway auto-detects `render.yaml` and deploys
6. The `VITE_API_URL` in `frontend/.env.production` already points to `https://aybolit-api.up.railway.app`

Cloud mode uses ephemeral ChromaDB (rebuilt at every cold start) and Groq Vision for OCR. For heavier sustained usage and better OCR accuracy on Armenian/Russian labels, prefer **Local Setup** above.

---

## Disclaimer

> **Aybolit provides educational information only.**
> Always consult a licensed physician or pharmacist for medical decisions.
> Aybolit is not a substitute for professional medical advice, diagnosis, or treatment.
> Never disregard professional medical advice or delay seeking it because of information provided by Aybolit.

---

## License

MIT © 2024 VaheMaleryan
