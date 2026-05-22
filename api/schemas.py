from pydantic import BaseModel, field_validator
from typing import List, Literal


class MedRequest(BaseModel):
    drug_name: str
    language: Literal["hy", "ru", "en"] = "hy"

    @field_validator("drug_name")
    @classmethod
    def name_min_length(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("drug_name must be at least 2 characters")
        return v.strip()


class MedResponse(BaseModel):
    drug_name: str
    found: bool
    summary_hy: str
    summary_ru: str
    what_it_does: str
    side_effects: List[str]
    dosage_guidance: str
    doctor_signal: Literal["routine", "monitor", "call_doctor", "emergency"]
    doctor_reason: str
    safe_with_food: bool
    processing_time_ms: float
    model: str
    source: str


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
