"""Medicine-image OCR with two interchangeable backends.

Default (cloud): Groq vision model — no extra system deps, just needs
GROQ_API_KEY.

Local (AYBOLIT_LOCAL=true): Tesseract OCR with Armenian + Russian +
English language packs. Higher accuracy on poorly-lit medicine boxes;
fully offline once Tesseract is installed.

Both backends return the same structured dict shape so the API contract
is identical regardless of backend.
"""
from __future__ import annotations

import base64
import io
import json
import logging
import os
from typing import Dict, Optional

from groq import Groq

logger = logging.getLogger("aybolit.ocr")

# Override via env so we can switch when Groq deprecates models.
# Current default (Nov 2025): llama-4-scout is Groq's primary vision model.
DEFAULT_VISION_MODEL = os.environ.get(
    "GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"
)

# Fallback chain if the primary model is unavailable / deprecated.
VISION_FALLBACKS = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    "llama-3.2-90b-vision-preview",
    "llama-3.2-11b-vision-preview",
]


VISION_PROMPT = """This is a medicine box, prescription, or drug leaflet.
Extract all medication information and return ONLY this JSON (no markdown, no preamble):
{
  "found": true,
  "drug_name": "medication name (just the name, no dose)",
  "dosage_strength": "e.g. 500mg, or null",
  "dosage_form": "tablet|capsule|syrup|injection|cream|drops|null",
  "manufacturer": "company name or null",
  "active_ingredient": "active substance or null",
  "warnings_text": ["warning 1", "warning 2"],
  "instructions_text": "how to take, brief, or null",
  "expiry_date": "date or null",
  "language_detected": "hy|ru|en|mixed",
  "raw_text": "all visible text"
}
If this is NOT a medicine-related image, set found: false."""


STRUCTURE_PROMPT = """The following is raw text extracted by OCR from a medicine box or prescription:

---
{raw}
---

Extract medication information and return ONLY this JSON:
{{
  "found": true,
  "drug_name": "medication name",
  "dosage_strength": "e.g. 500mg or null",
  "dosage_form": "tablet|capsule|syrup|injection|cream|drops|null",
  "manufacturer": "company name or null",
  "active_ingredient": "active substance or null",
  "warnings_text": ["warning 1", "warning 2"],
  "instructions_text": "how to take or null",
  "expiry_date": "date or null",
  "language_detected": "hy|ru|en|mixed",
  "raw_text": "first 200 chars of OCR text"
}}
If the text is not from a medicine, set found: false."""


def _not_medicine(error: Optional[str] = None) -> Dict:
    return {
        "found": False,
        "drug_name": None,
        "dosage_strength": None,
        "dosage_form": None,
        "manufacturer": None,
        "active_ingredient": None,
        "warnings_text": [],
        "instructions_text": None,
        "expiry_date": None,
        "language_detected": None,
        "raw_text": None,
        "error": error,
    }


def _coerce_result(d: Dict, raw_text: Optional[str] = None) -> Dict:
    """Make sure the AI's output matches our expected shape exactly."""
    out = _not_medicine()
    if not isinstance(d, dict):
        return out
    out["found"] = bool(d.get("found"))
    if out["found"]:
        out["drug_name"] = d.get("drug_name") or None
        out["dosage_strength"] = d.get("dosage_strength") or None
        out["dosage_form"] = d.get("dosage_form") or None
        out["manufacturer"] = d.get("manufacturer") or None
        out["active_ingredient"] = d.get("active_ingredient") or None
        warnings = d.get("warnings_text", [])
        if isinstance(warnings, str):
            warnings = [warnings]
        elif not isinstance(warnings, list):
            warnings = []
        out["warnings_text"] = [str(w) for w in warnings if w]
        out["instructions_text"] = d.get("instructions_text") or None
        out["expiry_date"] = d.get("expiry_date") or None
        out["language_detected"] = d.get("language_detected") or None
        out["raw_text"] = d.get("raw_text") or raw_text
    return out


class MedicationOCR:
    def __init__(self):
        self.groq_key = os.environ.get("GROQ_API_KEY", "")
        self.use_local = os.environ.get("AYBOLIT_LOCAL", "false").lower() == "true"
        self.vision_model = DEFAULT_VISION_MODEL

    @property
    def backend(self) -> str:
        return "tesseract" if self.use_local else "groq_vision"

    def extract_from_image(self, image_bytes: bytes,
                           mime_type: str = "image/jpeg") -> Dict:
        """Public entry point — dispatches to the configured backend."""
        if not image_bytes:
            return _not_medicine(error="Empty image")

        if self.use_local:
            return self._extract_tesseract(image_bytes)
        return self._extract_groq_vision(image_bytes, mime_type)

    # ── Cloud backend ─────────────────────────────────────────
    def _extract_groq_vision(self, image_bytes: bytes,
                              mime_type: str) -> Dict:
        if not self.groq_key:
            return _not_medicine(error="GROQ_API_KEY not set")

        client = Groq(api_key=self.groq_key)
        b64 = base64.b64encode(image_bytes).decode()

        messages = [{
            "role": "user",
            "content": [
                {"type": "image_url",
                 "image_url": {"url": f"data:{mime_type};base64,{b64}"}},
                {"type": "text", "text": VISION_PROMPT},
            ],
        }]

        # Try the configured model first, then fall back if it's gone.
        last_err: Optional[Exception] = None
        for model in [self.vision_model] + [
            m for m in VISION_FALLBACKS if m != self.vision_model
        ]:
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=0.1,
                    max_tokens=800,
                )
                text = response.choices[0].message.content or ""
                parsed = self._extract_json_block(text)
                return _coerce_result(parsed)
            except Exception as e:
                err_str = str(e)
                # Only retry on model-availability errors. For real API
                # errors (rate limit, auth) bail immediately.
                if any(s in err_str.lower() for s in
                       ("model_not_found", "decommissioned",
                        "does not exist", "404")):
                    logger.warning(f"vision model {model} unavailable: {e}")
                    last_err = e
                    continue
                logger.exception("Groq vision call failed")
                return _not_medicine(error=f"OCR failed: {e}")

        return _not_medicine(
            error=f"No vision model available. Last error: {last_err}"
        )

    # ── Local backend ─────────────────────────────────────────
    def _extract_tesseract(self, image_bytes: bytes) -> Dict:
        try:
            import pytesseract
            from PIL import Image
        except ImportError:
            return _not_medicine(
                error="Tesseract requires `pip install pytesseract pillow`."
            )

        try:
            img = Image.open(io.BytesIO(image_bytes))
            # hye+rus+eng requires those Tesseract language packs installed.
            # Fall back to eng-only if a pack is missing.
            try:
                raw_text = pytesseract.image_to_string(
                    img, lang="hye+rus+eng", config="--psm 3"
                )
            except pytesseract.TesseractError:
                raw_text = pytesseract.image_to_string(img, config="--psm 3")
        except pytesseract.TesseractNotFoundError:
            return _not_medicine(
                error="Tesseract binary not found. Install with `brew install tesseract tesseract-lang`."
            )
        except Exception as e:
            logger.exception("Tesseract OCR failed")
            return _not_medicine(error=f"OCR failed: {e}")

        if not raw_text or len(raw_text.strip()) < 3:
            return _not_medicine(error="No text detected in image")

        return self._structure_ocr_text(raw_text)

    def _structure_ocr_text(self, raw_text: str) -> Dict:
        """Hand the OCR text to the text LLM to structure it."""
        if not self.groq_key:
            # Fallback: return raw text only
            r = _not_medicine()
            r["found"] = True
            r["raw_text"] = raw_text[:1000]
            return r

        client = Groq(api_key=self.groq_key)
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user",
                           "content": STRUCTURE_PROMPT.format(raw=raw_text[:1500])}],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=600,
            )
            parsed = json.loads(response.choices[0].message.content)
            return _coerce_result(parsed, raw_text=raw_text[:200])
        except Exception as e:
            logger.exception("OCR text structuring failed")
            return _not_medicine(error=f"OCR structuring failed: {e}")

    # ── Helpers ───────────────────────────────────────────────
    @staticmethod
    def _extract_json_block(text: str) -> Dict:
        """Find the first {...} block in `text` and parse it."""
        if not text:
            return {}
        # Strip markdown fences if present
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = [l for l in cleaned.split("\n") if not l.startswith("```")]
            cleaned = "\n".join(lines).strip()
        start = cleaned.find("{")
        end = cleaned.rfind("}") + 1
        if start < 0 or end <= start:
            return {}
        try:
            return json.loads(cleaned[start:end])
        except json.JSONDecodeError:
            logger.warning(f"could not parse JSON from vision output: {cleaned[:200]}")
            return {}
