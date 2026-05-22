from .drug_data import check_interaction
from .explainer import explain_interaction
from .schemas import InteractionResponse
import time


def process_interaction(drug1: str, drug2: str, language: str = "hy") -> InteractionResponse:
    start = time.time()
    interaction_data = check_interaction(drug1, drug2)
    ai_result = explain_interaction(drug1, drug2, interaction_data, language)
    elapsed = (time.time() - start) * 1000

    verdict = ai_result.get("verdict", "caution")
    if not interaction_data["has_interaction"]:
        verdict = "safe"

    return InteractionResponse(
        drug1=drug1,
        drug2=drug2,
        verdict=verdict,
        explanation_hy=ai_result.get("explanation_hy", ""),
        explanation_ru=ai_result.get("explanation_ru", ""),
        recommendation=ai_result.get("recommendation", ""),
        severity=interaction_data.get("severity", "none"),
        processing_time_ms=round(elapsed, 2),
    )
