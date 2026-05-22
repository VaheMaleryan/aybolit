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

- **Type any medication name** in Armenian, Russian, or English
- **Get a plain-language explanation** in both Armenian and Russian simultaneously
- **Check if two medications interact safely** — with severity rating and bilingual explanation
- **Know when to call your doctor** — with a clear signal: Routine / Monitor / Call doctor / Emergency
- Side effects shown as color-coded pills (mild / moderate / severe)

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
| Drug data | OpenFDA API (free, no key) |
| Interactions | RxNorm API (free, no key) |
| Backend hosting | Railway |
| Frontend hosting | GitHub Pages |

---

## Quick Start

### Local development

```bash
# Clone
git clone https://github.com/VaheMaleryan/aybolit.git
cd aybolit

# Backend
export GROQ_API_KEY=your_key_here
uvicorn api.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Deploy frontend to GitHub Pages

```bash
cd frontend
npm run build
npm run deploy
```

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

Total queries, total interaction checks, uptime.

---

## Railway Deployment (Backend)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Select `VaheMaleryan/aybolit`
4. Set environment variables:
   - `GROQ_API_KEY` → your Groq API key
   - `DEGHATUN_DB` → `/tmp/aybolit.db`
5. Railway auto-detects `render.yaml` and deploys
6. The `VITE_API_URL` in `frontend/.env.production` already points to `https://aybolit-api.up.railway.app`

---

## Disclaimer

> **Aybolit provides educational information only.**
> Always consult a licensed physician or pharmacist for medical decisions.
> Aybolit is not a substitute for professional medical advice, diagnosis, or treatment.
> Never disregard professional medical advice or delay seeking it because of information provided by Aybolit.

---

## License

MIT © 2024 VaheMaleryan
