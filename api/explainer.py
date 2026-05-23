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
You are Aybolit (Այբոլիտ) — a friendly Armenian pharmacist assistant,
named after the beloved Soviet cartoon doctor. You explain medications
in simple language for Armenian patients who may not have medical
education. Be warm, clear, and reassuring.

You respond in the SAME LANGUAGE the user asks in:
- language=hy → respond in Armenian (հայերեն), proper Armenian script
- language=ru → respond in Russian (русский), proper Cyrillic
- language=en → respond in English

For the dosage_card, use language-specific units:
- Armenian:  "հաբ" (tablet), "մլ" (ml), "կաթիլ" (drop), "թեյի գդալ" (tsp), "ամպուլ"
- Russian:   "таблетка", "мл", "капля", "чайная ложка", "ампула"
- English:   "tablet", "ml", "drop", "teaspoon", "ampule"

You always:
1. Explain what the medication does in one simple sentence
2. Classify side effects by severity (mild / moderate / severe)
3. Give structured dosage guidance
4. Say clearly if the user should consult a doctor
5. Indicate whether a prescription is required
6. Never diagnose diseases or recommend stopping prescribed medication

You have access to the following drug information:
{drug_data}

You MUST return valid JSON only. No markdown fences. No preamble.
"""

EXPLAIN_PROMPT = """
Create a complete medication explanation as JSON.

Drug name: {drug_name}
Language requested: {language_name}

Return JSON with EXACTLY these keys:
{{
  "summary_hy": "Full explanation in Armenian (2-3 sentences, warm and clear)",
  "summary_ru": "Full explanation in Russian (2-3 sentences, warm and clear)",
  "what_it_does": "One clear sentence in {language_name} explaining the purpose",
  "medication_type": "antibiotic|painkiller|antiviral|antifungal|antihistamine|antihypertensive|antidiabetic|antidepressant|vitamin|hormone|gi_medication|respiratory|sedative|topical|other",
  "side_effects": [
    {{"effect": "name in {language_name}", "severity": "mild|moderate|severe"}},
    {{"effect": "...", "severity": "..."}},
    {{"effect": "...", "severity": "..."}},
    {{"effect": "...", "severity": "..."}},
    {{"effect": "...", "severity": "..."}}
  ],
  "dosage_card": {{
    "how_many": "amount per dose in {language_name} (e.g. '1-2 հաբ' / '1-2 таблетки' / '1-2 tablets')",
    "how_often": "frequency in {language_name} (e.g. 'Ամեն 6-8 ժամ' / 'Каждые 6-8 часов')",
    "with_food": "yes|no|preferred",
    "with_food_note": "short note in {language_name} about food",
    "max_per_day": "max daily dose in {language_name}",
    "duration": "treatment duration in {language_name}",
    "special_notes": ["short note 1 in {language_name}", "note 2"]
  }},
  "dosage_guidance": "Free-text dosage paragraph in {language_name}",
  "doctor_signal": "routine|monitor|call_doctor|emergency",
  "doctor_reason": "Why this signal — one sentence in {language_name}",
  "safe_with_food": true or false,
  "controlled_substance": true or false,
  "requires_prescription": true or false
}}

CRITICAL: The dosage_card text and side_effect names MUST be written in
{language_name}, not English (unless {language_name} is English).
Use proper Armenian/Cyrillic script — not transliteration.

Rules for severity:
- mild: tolerable (mild nausea, sleepiness, mild headache)
- moderate: should be discussed with a doctor if persistent (rash, dizziness, vomiting)
- severe: stop the drug and seek medical help (seizures, severe allergic reaction, bleeding)

Rules for with_food:
- "yes" → take with food (e.g. NSAIDs to protect stomach)
- "no" → must take on empty stomach (e.g. levothyroxine)
- "preferred" → either way is fine

Rules for requires_prescription:
- true: antibiotics, antidepressants, controlled substances, hypertension meds,
  insulin, asthma inhalers, opioids
- false: paracetamol, ibuprofen, aspirin, OTC antacids, common vitamins,
  loperamide, simethicone

Rules for doctor_signal:
- emergency: overdose / seizure / cardiac / anaphylaxis risk
- call_doctor: first-time use needs guidance, pregnancy warnings, severe SEs likely
- monitor: mild SEs, take-with-food warnings
- routine: common OTC drug, well-known safe profile

Return ONLY the JSON object. No prose. No markdown fences.
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
        max_tokens=2000,
        response_format={"type": "json_object"},
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
    result.setdefault("dosage_guidance", "")
    result.setdefault("doctor_reason", "")
    result.setdefault("safe_with_food", True)
    result.setdefault("medication_type", "other")
    result.setdefault("requires_prescription", None)
    result.setdefault("controlled_substance", False)

    # Coerce side_effects into list of {effect, severity} dicts. Accept:
    # - list of dicts (preferred shape)
    # - list of strings (legacy / fallback) → wrap as mild
    # - anything else → []
    raw_effects = result.get("side_effects", [])
    if not isinstance(raw_effects, list):
        raw_effects = [raw_effects]
    coerced: list = []
    for item in raw_effects:
        if isinstance(item, dict):
            effect = str(item.get("effect", "")).strip()
            severity = item.get("severity", "mild")
            if severity not in ("mild", "moderate", "severe"):
                severity = "mild"
            if effect:
                coerced.append({"effect": effect, "severity": severity})
        elif isinstance(item, str) and item.strip():
            coerced.append({"effect": item.strip(), "severity": "mild"})
    result["side_effects"] = coerced

    # Coerce dosage_card shape so Pydantic accepts it
    dc = result.get("dosage_card")
    if not isinstance(dc, dict):
        dc = {}
    dc.setdefault("how_many", "")
    dc.setdefault("how_often", "")
    wf = dc.get("with_food", "preferred")
    if wf not in ("yes", "no", "preferred"):
        wf = "preferred"
    dc["with_food"] = wf
    dc.setdefault("with_food_note", "")
    dc.setdefault("max_per_day", "")
    dc.setdefault("duration", "")
    notes = dc.get("special_notes", [])
    if not isinstance(notes, list):
        notes = [str(notes)]
    dc["special_notes"] = notes
    result["dosage_card"] = dc

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
        max_tokens=1000,
        response_format={"type": "json_object"},
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
