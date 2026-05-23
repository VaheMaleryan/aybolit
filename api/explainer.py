import os
import re
import json
import logging
from typing import Dict, Any
from groq import Groq

logger = logging.getLogger("aybolit.explainer")

MODEL = "llama-3.3-70b-versatile"

VALID_SIGNALS = {"routine", "monitor", "call_doctor", "emergency"}

SYSTEM_PROMPT = """
You are a friendly Armenian pharmacist assistant named Aybolit
(named after the beloved Soviet cartoon doctor).
You explain medications in simple, clear language that any
Armenian patient can understand — no medical jargon.

You respond in the SAME LANGUAGE the user asks in:
- If asked in Armenian (հայերեն) → answer in Armenian
- If asked in Russian (русский) → answer in Russian
- If asked in English → answer in English

You always:
1. Explain what the medication does in one simple sentence
2. List the most important side effects in plain words
3. Give basic dosage guidance (morning/evening/with food)
4. Say clearly if the user should consult a doctor
5. Never diagnose diseases
6. Never recommend stopping prescribed medication
7. Always end with: "Կասկածի դեպքում դիմեք բժշկի"
   (When in doubt, consult your doctor)

You have access to the following drug information:
{drug_data}

Be warm, clear, and reassuring. You are helping real patients
in Armenia who trust you.
"""

EXPLAIN_PROMPT = """
Based on the drug information provided, create a complete medication explanation.

Drug name: {drug_name}
Language requested: {language_name}

Return a JSON object with exactly these fields:
{{
  "summary_hy": "Full explanation in Armenian (2-3 sentences, warm and clear)",
  "summary_ru": "Full explanation in Russian (2-3 sentences, warm and clear)",
  "what_it_does": "One clear sentence in {language_name} explaining the purpose",
  "side_effects": ["effect 1 in plain {language_name}", "effect 2", "effect 3", "effect 4", "effect 5"],
  "dosage_guidance": "Clear dosage instructions in {language_name} (timing, amount, with/without food)",
  "doctor_signal": "routine|monitor|call_doctor|emergency",
  "doctor_reason": "Why this signal — one sentence in {language_name}",
  "safe_with_food": true or false
}}

Rules for doctor_signal:
- emergency: if warnings mention overdose, seizure risk, cardiac warning, anaphylaxis
- call_doctor: if first-time use recommended, pregnancy warnings, severe side effects
- monitor: if mild side effects, take-with-food warnings
- routine: common OTC medication, well-known safe drug

Return ONLY the JSON object, no other text, no markdown fences.
"""

INTERACTION_PROMPT = """
Two medications: {drug1} and {drug2}

Interaction data from RxNorm:
{interaction_data}

Create a bilingual interaction report. Return JSON:
{{
  "verdict": "safe|caution|dangerous",
  "explanation_hy": "Clear explanation in Armenian (what happens if taken together)",
  "explanation_ru": "Clear explanation in Russian",
  "recommendation": "What the patient should do — in {language_name}"
}}

Verdict rules:
- dangerous: severity is severe or high
- caution: severity is moderate or minor with real risk
- safe: no interaction or trivial interaction

Return ONLY the JSON object, no markdown fences, no other text.
"""

LANGUAGE_NAMES = {
    "hy": "Armenian",
    "ru": "Russian",
    "en": "English",
}


def _get_client() -> Groq:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY environment variable not set")
    return Groq(api_key=api_key)


def explain_medication(
    drug_name: str, drug_data: Dict[str, Any], language: str = "hy"
) -> Dict[str, Any]:
    client = _get_client()
    lang_name = LANGUAGE_NAMES.get(language, "Armenian")
    drug_data_str = json.dumps(drug_data, ensure_ascii=False, indent=2)

    system = SYSTEM_PROMPT.format(drug_data=drug_data_str)
    user_prompt = EXPLAIN_PROMPT.format(
        drug_name=drug_name,
        language_name=lang_name,
    )

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
        max_tokens=1500,
    )
    content = response.choices[0].message.content.strip()
    result = _safe_parse_json(content)

    # Validate / coerce signal
    signal = result.get("doctor_signal", "routine")
    if signal not in VALID_SIGNALS:
        signal = _determine_doctor_signal(drug_data)
    result["doctor_signal"] = signal

    # Ensure required fields exist with defaults
    result.setdefault("summary_hy", "")
    result.setdefault("summary_ru", "")
    result.setdefault("what_it_does", "")
    result.setdefault("side_effects", [])
    result.setdefault("dosage_guidance", "")
    result.setdefault("doctor_reason", "")
    result.setdefault("safe_with_food", True)
    if not isinstance(result.get("side_effects"), list):
        result["side_effects"] = [str(result["side_effects"])]

    result["model"] = MODEL
    return result


def explain_interaction(
    drug1: str, drug2: str, interaction_data: Dict[str, Any], language: str = "hy"
) -> Dict[str, Any]:
    client = _get_client()
    lang_name = LANGUAGE_NAMES.get(language, "Armenian")
    interaction_str = json.dumps(interaction_data, ensure_ascii=False, indent=2)

    prompt = INTERACTION_PROMPT.format(
        drug1=drug1,
        drug2=drug2,
        interaction_data=interaction_str,
        language_name=lang_name,
    )

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=800,
    )
    content = response.choices[0].message.content.strip()
    result = _safe_parse_json(content)

    verdict = result.get("verdict", "caution")
    if verdict not in {"safe", "caution", "dangerous"}:
        verdict = "caution"
    result["verdict"] = verdict

    result.setdefault("explanation_hy", "")
    result.setdefault("explanation_ru", "")
    result.setdefault("recommendation", "")
    return result


def _determine_doctor_signal(drug_data: Dict[str, Any]) -> str:
    """Keyword-based fallback when the AI returns an invalid signal."""
    text = " ".join([
        str(drug_data.get("warnings", "")),
        str(drug_data.get("contraindications", "")),
        str(drug_data.get("side_effects", "")),
    ]).lower()

    emergency_keywords = [
        "overdose", "seizure", "cardiac", "anaphylaxis",
        "anaphylactic", "heart attack", "stroke",
    ]
    call_keywords = ["pregnancy", "pregnant", "consult", "physician", "prescription"]
    monitor_keywords = ["nausea", "dizziness", "drowsiness", "fatigue", "food"]

    for kw in emergency_keywords:
        if kw in text:
            return "emergency"
    for kw in call_keywords:
        if kw in text:
            return "call_doctor"
    for kw in monitor_keywords:
        if kw in text:
            return "monitor"
    return "routine"


def _safe_parse_json(content: str) -> Dict[str, Any]:
    """Strip markdown fences and parse JSON. If it fails, extract the first
    {...} block. If that still fails, raise a clear error."""
    cleaned = _strip_markdown_json(content)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    logger.error("Could not parse AI JSON response: %s", content[:500])
    raise ValueError("AI returned invalid JSON")


def _strip_markdown_json(content: str) -> str:
    if content.startswith("```"):
        lines = content.split("\n")
        lines = [l for l in lines if not l.startswith("```")]
        content = "\n".join(lines)
    return content.strip()
