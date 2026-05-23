"""Tests for the MedicationMatcher fuzzy-matching layer."""
import pytest

from api.fuzzy_match import MedicationMatcher, get_matcher


@pytest.fixture(scope="module")
def matcher():
    return get_matcher()


def test_exact_match(matcher):
    """Exact display name → confidence 1.0."""
    r = matcher.find_match("Aspirin")
    assert r["found"] is True
    assert r["matched_name"] == "Aspirin"
    assert r["openfda_term"] == "Aspirin"
    assert r["confidence"] == 1.0


def test_typo_match(matcher):
    """Single-letter typo → matched with high confidence (>0.75)."""
    r = matcher.find_match("asprin")  # missing 'i'
    assert r["found"] is True
    assert r["matched_name"] == "Aspirin"
    assert r["confidence"] > 0.75


def test_typo_match_novel(matcher):
    """Novel typo not in variants list → still matched by fuzzy."""
    r = matcher.find_match("paracetamoll")  # extra l
    assert r["found"] is True
    assert r["matched_name"] == "Paracetamol"
    assert r["confidence"] > 0.75


def test_cyrillic_match(matcher):
    """Russian Cyrillic → matched."""
    r = matcher.find_match("парацетамол")
    assert r["found"] is True
    assert r["matched_name"] == "Paracetamol"
    assert r["openfda_term"] == "Acetaminophen"


def test_armenian_phonetic(matcher):
    """Latin phonetic spelling of Armenian → matched."""
    r = matcher.find_match("amoksisilin")
    assert r["found"] is True
    assert r["matched_name"] == "Amoxicillin"


def test_armenian_script(matcher):
    """Native Armenian script → matched after transliteration."""
    r = matcher.find_match("ասպիրին")
    assert r["found"] is True
    assert r["matched_name"] == "Aspirin"


def test_no_match(matcher):
    """Gibberish → not found."""
    r = matcher.find_match("xyzabc123nonsense")
    assert r["found"] is False
    assert r["matched_name"] is None
    assert r["confidence"] == 0.0


def test_brand_name(matcher):
    """Common brand name → matched to generic."""
    r = matcher.find_match("Nurofen")
    assert r["found"] is True
    assert r["matched_name"] == "Ibuprofen"

    r = matcher.find_match("Omez")
    assert r["found"] is True
    assert r["matched_name"] == "Omeprazole"


def test_empty_input(matcher):
    """Empty / whitespace input → not found."""
    assert matcher.find_match("").get("found") is False
    assert matcher.find_match("   ").get("found") is False


def test_suggestion_text_localized(matcher):
    """Result includes Armenian and Russian 'did you mean' phrasing."""
    r = matcher.find_match("asprin")
    assert "Aspirin" in r["suggestion_text_hy"]
    assert "Aspirin" in r["suggestion_text_ru"]
    assert "Aspirin" in r["suggestion_text_en"]
    assert "Նկատի" in r["suggestion_text_hy"]
    assert "имели" in r["suggestion_text_ru"]


def test_normalize_strips_punctuation():
    """Normalization removes punctuation and whitespace."""
    n = MedicationMatcher.normalize("As-pi rin!")
    assert n == "aspirin"


def test_normalize_handles_armenian():
    """Normalization transliterates Armenian to Latin."""
    n = MedicationMatcher.normalize("ասպիրին")
    assert n == "aspirin"


def test_normalize_handles_russian():
    """Normalization transliterates Cyrillic to Latin."""
    n = MedicationMatcher.normalize("Парацетамол")
    assert "paracetamol" in n or "paratsetamol" in n
