"""3-layer medication-name detection.

LAYER 1 — Script normalization (MedicationNormalizer)
LAYER 2 — Tier-1 catalog lookup (MedicationMatcher: exact then fuzzy)
LAYER 3 — Dynamic OpenFDA fallback (for drugs not in the catalog)

Returns a match dict whose `match_source` reveals which layer fired:
"tier1_exact" | "tier1_fuzzy" | "openfda_dynamic" | "not_found"
"""
from typing import Dict, List, Tuple, Optional
import string

from rapidfuzz import process, fuzz
from transliterate import translit
from transliterate.exceptions import LanguageDetectionError

from .med_catalog import MEDICATION_CATALOG

# Tier-1 fuzzy thresholds. We do two passes:
#  1. Strict typo match: fuzz.ratio ≥ 72 over the entire string. This
#     catches "asprin"→"aspirin" but rejects "spironolactone"→"iron".
#  2. Short prefix match: fuzz.partial_ratio ≥ 90, only when the query
#     is short (≤ SHORT_PREFIX_MAX). This catches "amox"→"amoxicillin"
#     without letting long queries substring-match short variants.
TIER1_RATIO_THRESHOLD = 72
TIER1_PREFIX_THRESHOLD = 90
SHORT_PREFIX_MAX = 6

# Unicode ranges for script detection
ARMENIAN_RANGE = (0x0530, 0x058F)
CYRILLIC_RANGE = (0x0400, 0x04FF)


# ─────────────────────────────────────────────────────────────────
# LAYER 1 — Script normalization
# ─────────────────────────────────────────────────────────────────

class MedicationNormalizer:
    @staticmethod
    def detect_script(text: str) -> str:
        """Return 'armenian' | 'cyrillic' | 'latin' | 'mixed' based on
        which scripts appear in `text`. Ignores digits and whitespace."""
        if not text:
            return "latin"
        has_armenian = False
        has_cyrillic = False
        has_latin = False
        for ch in text:
            cp = ord(ch)
            if ARMENIAN_RANGE[0] <= cp <= ARMENIAN_RANGE[1]:
                has_armenian = True
            elif CYRILLIC_RANGE[0] <= cp <= CYRILLIC_RANGE[1]:
                has_cyrillic = True
            elif ch.isalpha() and ch.isascii():
                has_latin = True
        scripts = sum([has_armenian, has_cyrillic, has_latin])
        if scripts > 1:
            return "mixed"
        if has_armenian:
            return "armenian"
        if has_cyrillic:
            return "cyrillic"
        return "latin"

    @staticmethod
    def transliterate_to_latin(text: str) -> str:
        """Convert any script in `text` to Latin. Handles mixed scripts by
        running both Armenian and Russian transliteration — each is a no-op
        on the script it doesn't recognize."""
        if not text:
            return ""
        s = text
        # Armenian first (transliterate raises if no Armenian found —
        # we silently skip)
        try:
            s = translit(s, "hy", reversed=True)
        except (LanguageDetectionError, Exception):
            pass
        try:
            s = translit(s, "ru", reversed=True)
        except (LanguageDetectionError, Exception):
            pass
        return s

    def normalize(self, text: str) -> str:
        """Full normalization pipeline: transliterate → lowercase →
        keep [a-z0-9-] only → collapse whitespace."""
        if not text:
            return ""
        s = self.transliterate_to_latin(text.strip())
        s = s.lower()
        # Keep letters, digits, and hyphens; drop everything else
        s = "".join(c if (c.isalnum() or c == "-") else " " for c in s)
        s = " ".join(s.split())  # collapse repeated spaces
        # Remove all spaces for matching key (consistent index)
        s = s.replace(" ", "")
        return s


# ─────────────────────────────────────────────────────────────────
# LAYER 2 + 3 — Catalog matcher with OpenFDA fallback
# ─────────────────────────────────────────────────────────────────

class MedicationMatcher:
    def __init__(self):
        self.normalizer = MedicationNormalizer()
        # normalized_variant_string -> (canonical, openfda_term, category)
        self._index: Dict[str, Tuple[str, str, str]] = {}
        for med in MEDICATION_CATALOG:
            entry = (med["canonical"], med["openfda_term"], med["category"])
            self._index[self.normalizer.normalize(med["canonical"])] = entry
            for v in med["variants"]:
                key = self.normalizer.normalize(v)
                if key and key not in self._index:
                    self._index[key] = entry
        self._keys: List[str] = list(self._index.keys())

    # ── Helpers ─────────────────────────────────────────────────
    def _result(
        self,
        *,
        canonical: str,
        openfda_term: str,
        category: str,
        confidence: float,
        match_source: str,
        original_query: str,
        normalized_query: str,
        did_you_mean: Optional[str],
    ) -> Dict:
        suggestion_hy = (
            f"Նկատի ունեի՞ք {canonical}" if did_you_mean else None
        )
        suggestion_ru = (
            f"Вы имели в виду {canonical}" if did_you_mean else None
        )
        return {
            "found": True,
            "canonical_name": canonical,
            "openfda_term": openfda_term,
            "category": category,
            "confidence": round(confidence, 3),
            "match_source": match_source,
            "original_query": original_query,
            "normalized_query": normalized_query,
            "did_you_mean": did_you_mean,
            "suggestion_hy": suggestion_hy,
            "suggestion_ru": suggestion_ru,
        }

    def _not_found(self, original_query: str, normalized_query: str) -> Dict:
        return {
            "found": False,
            "canonical_name": None,
            "openfda_term": None,
            "category": None,
            "confidence": 0.0,
            "match_source": "not_found",
            "original_query": original_query,
            "normalized_query": normalized_query,
            "did_you_mean": None,
            "suggestion_hy": None,
            "suggestion_ru": None,
        }

    @staticmethod
    def _did_you_mean(original_norm: str, canonical_norm: str,
                      canonical: str) -> Optional[str]:
        """Only suggest the canonical name when the user typed something
        meaningfully different from it."""
        return canonical if original_norm != canonical_norm else None

    @staticmethod
    def _prefix_compatible(query: str, candidate: str, score: float) -> bool:
        """Filter out spurious matches that share only a suffix.
        Real drug-name typos almost always preserve the first 2 characters.
        We waive the prefix requirement when the overall similarity is
        very high (≥ 88) since that means the entire string is a near-match.
        """
        if score >= 88:
            return True
        if not query or not candidate:
            return False
        return query[:2] == candidate[:2]

    # ── Core dispatch ──────────────────────────────────────────
    def find_match(self, query: str) -> Dict:
        original = query
        norm = self.normalizer.normalize(query)
        if not norm:
            return self._not_found(original, norm)

        # ── TIER 1 EXACT ──────────────────────────────────────
        if norm in self._index:
            canonical, openfda_term, category = self._index[norm]
            canonical_norm = self.normalizer.normalize(canonical)
            return self._result(
                canonical=canonical,
                openfda_term=openfda_term,
                category=category,
                confidence=1.0,
                match_source="tier1_exact",
                original_query=original,
                normalized_query=norm,
                did_you_mean=self._did_you_mean(norm, canonical_norm, canonical),
            )

        # ── TIER 1 FUZZY (pass 1: strict ratio with prefix gate) ──
        # Pull the top 5 candidates instead of just the best, so we can
        # apply a structural prefix-match filter — real drug-name typos
        # almost always preserve the first 2 characters. This rejects
        # cases like "hydroxyzine"→"l-thyroxine" that share only a suffix.
        candidates = process.extract(
            norm,
            self._keys,
            scorer=fuzz.ratio,
            score_cutoff=TIER1_RATIO_THRESHOLD,
            limit=5,
        )
        best = None
        for matched_key, score, _ in candidates:
            if self._prefix_compatible(norm, matched_key, score):
                best = (matched_key, score)
                break

        # ── TIER 1 FUZZY (pass 2: short-prefix substring match) ──
        # For very short queries (e.g. "amox"), allow substring match
        # against longer variants. Length guard prevents long queries
        # from substring-matching short variants (spironolactone→iron).
        if best is None and len(norm) <= SHORT_PREFIX_MAX:
            sub = process.extractOne(
                norm,
                self._keys,
                scorer=fuzz.partial_ratio,
                score_cutoff=TIER1_PREFIX_THRESHOLD,
            )
            if sub is not None and self._prefix_compatible(norm, sub[0], sub[1]):
                best = (sub[0], sub[1])

        if best is not None:
            matched_key, score = best
            canonical, openfda_term, category = self._index[matched_key]
            canonical_norm = self.normalizer.normalize(canonical)
            return self._result(
                canonical=canonical,
                openfda_term=openfda_term,
                category=category,
                confidence=score / 100.0,
                match_source="tier1_fuzzy",
                original_query=original,
                normalized_query=norm,
                did_you_mean=self._did_you_mean(norm, canonical_norm, canonical),
            )

        # ── LAYER 3: OpenFDA dynamic ──────────────────────────
        # Late import so the catalog can be used without network code
        from .drug_data import fetch_drug_info
        fda_data = fetch_drug_info(original)
        if not fda_data.get("found"):
            # Try the normalized form too
            fda_data = fetch_drug_info(norm)
        if fda_data.get("found"):
            # Use the FDA's reported brand/generic name as canonical
            brand = (fda_data.get("brand_name") or "").strip()
            generic = (fda_data.get("generic_name") or "").strip()
            canonical = brand or generic or original
            # Title-case for cleaner display
            if canonical.isupper() or canonical.islower():
                canonical = canonical.title()
            openfda_term = generic or brand or original
            return self._result(
                canonical=canonical,
                openfda_term=openfda_term,
                category="Other",
                confidence=0.85,
                match_source="openfda_dynamic",
                original_query=original,
                normalized_query=norm,
                did_you_mean=None,  # don't second-guess FDA results
            )

        # ── Not found anywhere ────────────────────────────────
        return self._not_found(original, norm)


# Module-level singleton (instantiating the catalog is non-trivial)
_matcher: Optional[MedicationMatcher] = None


def get_matcher() -> MedicationMatcher:
    global _matcher
    if _matcher is None:
        _matcher = MedicationMatcher()
    return _matcher
