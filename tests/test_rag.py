"""Tests for the RAG layer (vector ingest, retrieval, chunking)."""
import pytest

from api.rag import MedicationRAG, CHUNK_WORDS, CHUNK_OVERLAP


@pytest.fixture(scope="module")
def sample_data():
    return {
        "purpose": "Purpose Pain reliever and fever reducer",
        "dosage": (
            "Adults take 1 to 2 tablets every 4 to 6 hours while symptoms "
            "persist. Do not exceed 6 tablets in 24 hours. Use the smallest "
            "effective dose. For children under 12, consult a doctor."
        ),
        "warnings": (
            "Stop use and ask doctor if symptoms get worse, ringing in ears "
            "occurs, or pain lasts more than 10 days. Reye syndrome risk in "
            "children with viral illness."
        ),
        "side_effects": "May cause stomach bleeding, allergic reactions, nausea, dizziness",
        "drug_interactions": "Do not take with warfarin or other anticoagulants",
        "contraindications": "Aspirin allergy, active stomach ulcer",
        "pregnancy": "Avoid during last trimester",
    }


@pytest.fixture(scope="module")
def rag():
    """Single RAG instance shared across tests (model load is ~10s)."""
    return MedicationRAG(persist_local=False)


def test_rag_init_ephemeral(rag):
    """Fresh RAG starts empty and reports ephemeral mode."""
    stats = rag.get_stats()
    assert stats["mode"] == "ephemeral"
    assert "embed_model" in stats


def test_rag_empty_collection_retrieve(rag):
    """retrieve() returns [] when collection is empty (no exception)."""
    # Make sure we're truly empty for this drug
    hits = rag.retrieve("anything", "DoesNotExist_drug_999", n=3)
    assert hits == []


def test_rag_add_and_retrieve(rag, sample_data):
    """Add a drug, retrieve a relevant chunk."""
    n_added = rag.add_medication("Aspirin", sample_data)
    assert n_added > 0

    hits = rag.retrieve("how many tablets per dose", "Aspirin", n=3)
    assert len(hits) > 0
    # The top hit should be the dosage chunk
    sections = [h["section"] for h in hits]
    assert "dosage" in sections
    # Each hit carries a citation source
    assert all(h["source"] == "OpenFDA" for h in hits)


def test_rag_idempotent_add(rag, sample_data):
    """Adding the same drug twice doesn't duplicate chunks."""
    before = rag.get_stats()["total_chunks"]
    n_added = rag.add_medication("Aspirin", sample_data)
    after = rag.get_stats()["total_chunks"]
    assert n_added == 0
    assert before == after


def test_rag_chunking_includes_section(rag, sample_data):
    """Internal chunker emits one or more chunks per section that has data."""
    chunks = rag._chunk_drug_data("Aspirin", sample_data)
    assert len(chunks) > 0
    sections = {c["section"] for c in chunks}
    # Every non-empty input section should appear
    assert "dosage" in sections
    assert "warnings" in sections
    assert "side_effects" in sections
    # Drug name is embedded in chunk text for retrieval bias
    assert all("Aspirin" in c["text"] for c in chunks)


def test_rag_chunking_overlap_long_section(rag):
    """A section longer than CHUNK_WORDS produces multiple overlapping chunks."""
    long_text = " ".join([f"word{i}" for i in range(200)])
    data = {"warnings": long_text}
    chunks = rag._chunk_drug_data("FakeDrug", data)
    assert len(chunks) >= 2  # 200 words / (50-8 step) ≈ 5 windows


def test_rag_filters_by_drug_name(rag, sample_data):
    """Retrieval is scoped to the requested drug (no cross-contamination)."""
    # Add a second drug
    other = {
        "purpose": "Reduces high blood pressure",
        "dosage": "Take 10mg once daily in the morning",
        "warnings": "Do not stop abruptly",
    }
    rag.add_medication("Lisinopril", other)

    hits = rag.retrieve("dosage", "Lisinopril", n=5)
    assert len(hits) > 0
    assert all("Lisinopril" in h["text"] for h in hits)


def test_rag_multilingual_query(rag, sample_data):
    """A non-English query still retrieves relevant English chunks
    thanks to the multilingual embedding model."""
    # 'doses' / 'дозировка' / 'doza' all should pull dosage chunks
    hits_en = rag.retrieve("doses tablets per day", "Aspirin", n=3)
    hits_ru = rag.retrieve("дозировка таблеток в день", "Aspirin", n=3)
    assert len(hits_en) > 0 and len(hits_ru) > 0
    # At least one of the retrieved chunks should be from the dosage section
    assert "dosage" in [h["section"] for h in hits_ru]


def test_rag_stats_grows_with_ingest(rag):
    """get_stats reports a non-zero count after we've ingested data."""
    stats = rag.get_stats()
    assert stats["total_chunks"] > 0
    assert stats["mode"] == "ephemeral"
