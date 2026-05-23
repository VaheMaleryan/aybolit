"""Fuzzy medication-name matching with multi-script normalization.

Handles:
- Typos (asprin → Aspirin)
- Russian Cyrillic (парацетамол → Paracetamol)
- Armenian script (ասպիրին → Aspirin)
- Phonetic Latin spellings (amoksisilin → Amoxicillin)
- Common brand names (Nurofen → Ibuprofen)
"""
from typing import Dict, List, Tuple, Optional
import string

from rapidfuzz import process, fuzz
from transliterate import translit
from transliterate.exceptions import LanguageDetectionError

# Confidence threshold (0-100 in rapidfuzz). 75 = 75% similar.
MATCH_THRESHOLD = 75


# Common medications in Armenia + variants users might type.
# Format: (display_name, [variants/typos/translations], openfda_search_term)
COMMON_ARMENIAN_MEDS: List[Tuple[str, List[str], str]] = [
    ("Paracetamol",
     ["paracetamol", "parcetamol", "парацетамол", "paratsetamol",
      "պարացետամոլ", "Панадол", "Panadol", "acetaminophen", "tylenol"],
     "Acetaminophen"),
    ("Aspirin",
     ["aspirin", "asprin", "аспирин", "ასპირინი", "aspiren", "ասպիրին"],
     "Aspirin"),
    ("Amoxicillin",
     ["amoxicillin", "amoksisilin", "amoxicilin", "амоксициллин",
      "ամոքսիցիլին", "Амоксил", "amoxil"],
     "Amoxicillin"),
    ("Ibuprofen",
     ["ibuprofen", "ибупрофен", "Нурофен", "Nurofen", "advil",
      "իբուպրոֆեն"],
     "Ibuprofen"),
    ("Metformin",
     ["metformin", "метформин", "Glucophage", "glucophage", "մետֆորմին"],
     "Metformin"),
    ("Atorvastatin",
     ["atorvastatin", "аторвастатин", "Липитор", "Lipitor",
      "ատորվաստատին"],
     "Atorvastatin"),
    ("Omeprazole",
     ["omeprazole", "omeprazol", "омепразол", "Омез", "Omez",
      "օմեպրազոլ"],
     "Omeprazole"),
    ("Amlodipine",
     ["amlodipine", "амлодипин", "Norvasc", "ամլոդիպին"],
     "Amlodipine"),
    ("Lisinopril",
     ["lisinopril", "лизиноприл", "Prinivil", "լիզինոպրիլ"],
     "Lisinopril"),
    ("Ciprofloxacin",
     ["ciprofloxacin", "ципрофлоксацин", "Ципролет", "Ciprolet",
      "ցիպրոֆլոքսացին", "cipro"],
     "Ciprofloxacin"),
    ("Doxycycline",
     ["doxycycline", "доксициклин", "դոքսիցիկլին", "Vibramycin"],
     "Doxycycline"),
    ("Metronidazole",
     ["metronidazole", "метронидазол", "Флагил", "Flagyl",
      "մետրոնիդազոլ", "trichopol", "Трихопол"],
     "Metronidazole"),
    ("Diclofenac",
     ["diclofenac", "диклофенак", "Вольтарен", "Voltaren",
      "դիկլոֆենակ"],
     "Diclofenac"),
    ("Prednisolone",
     ["prednisolone", "преднизолон", "պրեդնիզոլոն"],
     "Prednisolone"),
    ("Azithromycin",
     ["azithromycin", "азитромицин", "Сумамед", "Sumamed",
      "ազիտրոմիցին"],
     "Azithromycin"),
]


class MedicationMatcher:
    def __init__(self):
        # Build a flat index: normalized_variant → (display_name, openfda_term)
        self._index: Dict[str, Tuple[str, str]] = {}
        for display, variants, openfda_term in COMMON_ARMENIAN_MEDS:
            # Always index the display name itself
            self._index[self.normalize(display)] = (display, openfda_term)
            for v in variants:
                key = self.normalize(v)
                if key and key not in self._index:
                    self._index[key] = (display, openfda_term)
        self._keys: List[str] = list(self._index.keys())

    @staticmethod
    def normalize(text: str) -> str:
        """Lowercase, strip script (Armenian/Russian → Latin), strip
        whitespace and punctuation. Returns Latin lowercase ASCII-ish."""
        if not text:
            return ""
        s = text.strip()

        # Try Armenian transliteration first (only converts if Armenian script present)
        try:
            s = translit(s, "hy", reversed=True)
        except (LanguageDetectionError, Exception):
            pass
        # Then Russian (only converts if Cyrillic present)
        try:
            s = translit(s, "ru", reversed=True)
        except (LanguageDetectionError, Exception):
            pass

        s = s.lower()
        # Strip whitespace and punctuation
        s = "".join(c for c in s if c not in string.whitespace and c not in string.punctuation)
        return s

    def find_match(self, query: str) -> Dict:
        """Return best match or {'found': False, ...}."""
        original = query
        norm = self.normalize(query)

        if not norm:
            return self._no_match(original)

        # 1. Exact normalized match → confidence 1.0
        if norm in self._index:
            display, openfda_term = self._index[norm]
            return self._make_result(display, openfda_term, 1.0, original)

        # 2. Fuzzy match against all normalized variants
        best = process.extractOne(
            norm,
            self._keys,
            scorer=fuzz.WRatio,
            score_cutoff=MATCH_THRESHOLD,
        )
        if best is None:
            return self._no_match(original)

        matched_key, score, _ = best
        display, openfda_term = self._index[matched_key]
        confidence = score / 100.0
        return self._make_result(display, openfda_term, confidence, original)

    @staticmethod
    def _make_result(
        display: str, openfda_term: str, confidence: float, original: str
    ) -> Dict:
        return {
            "found": True,
            "matched_name": display,
            "openfda_term": openfda_term,
            "confidence": round(confidence, 3),
            "original_query": original,
            "suggestion_text_hy": f"Նկատի ունեի՞ք {display}",
            "suggestion_text_ru": f"Вы имели в виду {display}",
            "suggestion_text_en": f"Did you mean {display}",
        }

    @staticmethod
    def _no_match(original: str) -> Dict:
        return {
            "found": False,
            "matched_name": None,
            "openfda_term": None,
            "confidence": 0.0,
            "original_query": original,
            "suggestion_text_hy": None,
            "suggestion_text_ru": None,
            "suggestion_text_en": None,
        }


# Module-level singleton
_matcher: Optional[MedicationMatcher] = None


def get_matcher() -> MedicationMatcher:
    global _matcher
    if _matcher is None:
        _matcher = MedicationMatcher()
    return _matcher
