from pydantic import BaseModel, field_validator
from typing import List, Literal, Optional


class MedRequest(BaseModel):
    drug_name: str
    language: Literal["hy", "ru", "en"] = "hy"

    @field_validator("drug_name")
    @classmethod
    def name_min_length(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("drug_name must be at least 2 characters")
        return v.strip()


class DosageCard(BaseModel):
    how_many: str = ""
    how_often: str = ""
    with_food: Literal["yes", "no", "preferred"] = "preferred"
    with_food_note: str = ""
    max_per_day: str = ""
    duration: str = ""
    special_notes: List[str] = []


class MedResponse(BaseModel):
    drug_name: str
    found: bool
    summary_hy: str
    summary_ru: str
    what_it_does: str
    side_effects: List[str]
    dosage_guidance: str
    dosage_card: Optional[DosageCard] = None
    doctor_signal: Literal["routine", "monitor", "call_doctor", "emergency"]
    doctor_reason: str
    safe_with_food: bool
    processing_time_ms: float
    model: str
    source: str
    # Fuzzy-match suggestions (populated when user's spelling was corrected)
    did_you_mean: Optional[str] = None
    did_you_mean_hy: Optional[str] = None
    did_you_mean_ru: Optional[str] = None
    matched_name: Optional[str] = None


class InteractionRequest(BaseModel):
    drug1: str
    drug2: str
    language: Literal["hy", "ru", "en"] = "hy"

    @field_validator("drug1", "drug2")
    @classmethod
    def name_min_length(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("drug name must be at least 2 characters")
        return v.strip()


class InteractionResponse(BaseModel):
    drug1: str
    drug2: str
    verdict: Literal["safe", "caution", "dangerous"]
    explanation_hy: str
    explanation_ru: str
    recommendation: str
    severity: str
    processing_time_ms: float


class SearchResponse(BaseModel):
    suggestions: List[str]
