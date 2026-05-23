"""Tests for the 3-layer MedicationMatcher pipeline."""
import pytest

from api.fuzzy_match import MedicationMatcher, MedicationNormalizer, get_matcher


@pytest.fixture(scope="module")
def matcher():
    return get_matcher()


@pytest.fixture(scope="module")
def normalizer():
    return MedicationNormalizer()


# ─────────────────────────────────────────────────────────────────
# TIER 1 tests
# ─────────────────────────────────────────────────────────────────

def test_exact_latin(matcher):
    """Exact display name → tier1_exact, confidence 1.0."""
    r = matcher.find_match("Aspirin")
    assert r["found"] is True
    assert r["canonical_name"] == "Aspirin"
    assert r["openfda_term"] == "Aspirin"
    assert r["confidence"] == 1.0
    assert r["match_source"] == "tier1_exact"
    assert r["category"] == "Pain/Fever"


def test_typo_latin(matcher):
    """Latin typo → matched."""
    r = matcher.find_match("asprin")
    assert r["found"] is True
    assert r["canonical_name"] == "Aspirin"
    # Could be tier1_exact (in variants) or tier1_fuzzy — either is fine
    assert r["match_source"] in ("tier1_exact", "tier1_fuzzy")


def test_typo_novel(matcher):
    """A typo NOT in the variant list → fuzzy fallback."""
    r = matcher.find_match("paracetamoll")
    assert r["found"] is True
    assert r["canonical_name"] == "Paracetamol"
    assert r["confidence"] > 0.72


def test_cyrillic(matcher):
    """Russian Cyrillic → matched after transliteration."""
    r = matcher.find_match("парацетамол")
    assert r["found"] is True
    assert r["canonical_name"] == "Paracetamol"
    assert r["openfda_term"] == "Acetaminophen"


def test_armenian_script(matcher):
    """Native Armenian script → matched after transliteration."""
    r = matcher.find_match("ասպիրին")
    assert r["found"] is True
    assert r["canonical_name"] == "Aspirin"


def test_russian_in_latin(matcher):
    """Russian phonetic written in Latin → matched."""
    r = matcher.find_match("paratsetamol")
    assert r["found"] is True
    assert r["canonical_name"] == "Paracetamol"


def test_brand_name(matcher):
    """Common brand name → matched to generic."""
    r = matcher.find_match("Nurofen")
    assert r["found"] is True
    assert r["canonical_name"] == "Ibuprofen"
    assert r["category"] == "Pain/Fever"


def test_brand_cyrillic(matcher):
    """Brand name in Cyrillic → matched."""
    r = matcher.find_match("Нурофен")
    assert r["found"] is True
    assert r["canonical_name"] == "Ibuprofen"


def test_partial_name(matcher):
    """Partial name → fuzzy match returns canonical."""
    r = matcher.find_match("amox")
    assert r["found"] is True
    assert r["canonical_name"] == "Amoxicillin"


def test_mixed_script(matcher):
    """Mixed Cyrillic + Latin → matched."""
    r = matcher.find_match("Амокси cillin")
    assert r["found"] is True
    assert r["canonical_name"] == "Amoxicillin"


def test_antibiotic_sumamed(matcher):
    """Sumamed → Azithromycin."""
    r = matcher.find_match("Sumamed")
    assert r["found"] is True
    assert r["canonical_name"] == "Azithromycin"
    assert r["category"] == "Antibiotic"


def test_stomach_cerucal(matcher):
    """Церукал → Metoclopramide."""
    r = matcher.find_match("Церукал")
    assert r["found"] is True
    assert r["canonical_name"] == "Metoclopramide"
    assert r["category"] == "GI"


def test_heart_concor(matcher):
    """Concor → Bisoprolol."""
    r = matcher.find_match("Concor")
    assert r["found"] is True
    assert r["canonical_name"] == "Bisoprolol"
    assert r["category"] == "Cardiovascular"


def test_vitamin_magne(matcher):
    """Magne B6 → Magnesium."""
    r = matcher.find_match("Magne B6")
    assert r["found"] is True
    assert r["canonical_name"] == "Magnesium"
    assert r["category"] == "Vitamin"


def test_no_match(matcher):
    """Pure nonsense → not_found across all 3 layers."""
    r = matcher.find_match("xyzabc123nonsense-foo-bar-baz")
    assert r["found"] is False
    assert r["canonical_name"] is None
    assert r["confidence"] == 0.0
    assert r["match_source"] == "not_found"


def test_empty_input(matcher):
    """Empty/whitespace input → not found."""
    assert matcher.find_match("").get("found") is False
    assert matcher.find_match("   ").get("found") is False


def test_suggestion_localized(matcher):
    """When user spells differently from canonical → localized suggestions."""
    r = matcher.find_match("asprin")
    assert r["did_you_mean"] == "Aspirin"
    assert "Aspirin" in r["suggestion_hy"]
    assert "Aspirin" in r["suggestion_ru"]
    assert "Նկատի" in r["suggestion_hy"]
    assert "имели" in r["suggestion_ru"]


def test_no_suggestion_for_exact(matcher):
    """When user types canonical exactly → no did_you_mean."""
    r = matcher.find_match("Aspirin")
    assert r["did_you_mean"] is None


# ─────────────────────────────────────────────────────────────────
# Layer 3 (OpenFDA dynamic) — network test
# ─────────────────────────────────────────────────────────────────

def test_rare_drug_opensearch(matcher):
    """Drug not in tier-1 catalog but real in OpenFDA → openfda_dynamic.
    'Tylenol' is in our catalog as a Paracetamol variant, so we use
    something less common: 'Hydroxyzine' (a real drug, not in tier-1)."""
    r = matcher.find_match("Hydroxyzine")
    # We accept either openfda_dynamic (good) or not_found (FDA may be flaky);
    # we DON'T want a false tier1 match for an unknown drug.
    assert r["match_source"] in ("openfda_dynamic", "not_found")
    if r["match_source"] == "openfda_dynamic":
        assert r["canonical_name"] is not None


# ─────────────────────────────────────────────────────────────────
# Normalizer tests
# ─────────────────────────────────────────────────────────────────

def test_normalize_cyrillic(normalizer):
    n = normalizer.normalize("Парацетамол")
    assert n in ("paracetamol", "paratsetamol")


def test_normalize_armenian(normalizer):
    n = normalizer.normalize("ասպիրին")
    assert n == "aspirin"


def test_normalize_mixed(normalizer):
    """Mixed scripts collapse to lowercase Latin."""
    n = normalizer.normalize("Амокси cillin")
    # cyrillic 'Амокси' → 'amoksi', plus 'cillin' → 'amoksicillin'
    assert n == "amoksicillin"


def test_normalize_strips_punctuation(normalizer):
    assert normalizer.normalize("As-pi rin!") == "as-pirin"


def test_detect_script(normalizer):
    assert normalizer.detect_script("Aspirin") == "latin"
    assert normalizer.detect_script("парацетамол") == "cyrillic"
    assert normalizer.detect_script("ասպիրին") == "armenian"
    assert normalizer.detect_script("Амокси cillin") == "mixed"
    assert normalizer.detect_script("") == "latin"
    # Numbers and spaces don't change the verdict
    assert normalizer.detect_script("Vitamin D3") == "latin"


def test_detect_script_with_numbers(normalizer):
    assert normalizer.detect_script("Magne B6") == "latin"
    assert normalizer.detect_script("Магне B6") == "mixed"
