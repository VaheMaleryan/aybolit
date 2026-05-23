"""Tests for the OCR layer (Groq vision backend + size/format validation)."""
import io
import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from api.main import app
from api.ocr import MedicationOCR, _coerce_result


# ─────────────────────────────────────────────────────────────
# Pure-OCR unit tests
# ─────────────────────────────────────────────────────────────

def _make_test_image_bytes() -> bytes:
    """Generate a tiny in-memory JPEG for tests."""
    img = Image.new("RGB", (200, 100), color="white")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_backend_indicator_cloud(monkeypatch):
    """When AYBOLIT_LOCAL is unset, backend reports groq_vision."""
    monkeypatch.delenv("AYBOLIT_LOCAL", raising=False)
    ocr = MedicationOCR()
    assert ocr.backend == "groq_vision"


def test_backend_indicator_local(monkeypatch):
    """When AYBOLIT_LOCAL=true, backend reports tesseract."""
    monkeypatch.setenv("AYBOLIT_LOCAL", "true")
    ocr = MedicationOCR()
    assert ocr.backend == "tesseract"


def test_empty_image_returns_not_found():
    """Empty bytes yields a clean 'not found' dict, no exception."""
    ocr = MedicationOCR()
    result = ocr.extract_from_image(b"", "image/jpeg")
    assert result["found"] is False


def test_groq_vision_no_key(monkeypatch):
    """If GROQ_API_KEY is missing, Groq backend reports error gracefully."""
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("AYBOLIT_LOCAL", raising=False)
    ocr = MedicationOCR()
    result = ocr.extract_from_image(_make_test_image_bytes(), "image/jpeg")
    assert result["found"] is False
    assert result["error"] is not None
    assert "GROQ_API_KEY" in result["error"]


def test_coerce_result_handles_string_warnings():
    """If the model returns warnings as a string instead of a list, coerce."""
    raw = {
        "found": True,
        "drug_name": "Aspirin",
        "warnings_text": "single warning string",
    }
    out = _coerce_result(raw)
    assert out["found"] is True
    assert out["warnings_text"] == ["single warning string"]


def test_coerce_result_handles_garbage():
    """Non-dict input → clean not-found shape."""
    out = _coerce_result("not a dict")
    assert out["found"] is False


def test_groq_vision_mocked_success(monkeypatch):
    """Mock the Groq client and verify the response is parsed into our shape."""
    monkeypatch.setenv("GROQ_API_KEY", "test-key-xyz")
    monkeypatch.delenv("AYBOLIT_LOCAL", raising=False)
    ocr = MedicationOCR()

    fake_completion = MagicMock()
    fake_completion.choices = [MagicMock()]
    fake_completion.choices[0].message.content = json.dumps({
        "found": True,
        "drug_name": "Aspirin",
        "dosage_strength": "500mg",
        "dosage_form": "tablet",
        "manufacturer": "Bayer",
        "warnings_text": ["May cause bleeding"],
        "language_detected": "en",
        "raw_text": "Aspirin 500mg tablets",
    })
    fake_client = MagicMock()
    fake_client.chat.completions.create.return_value = fake_completion

    with patch("api.ocr.Groq", return_value=fake_client):
        result = ocr.extract_from_image(_make_test_image_bytes(), "image/jpeg")

    assert result["found"] is True
    assert result["drug_name"] == "Aspirin"
    assert result["dosage_strength"] == "500mg"
    assert result["warnings_text"] == ["May cause bleeding"]


def test_groq_vision_mocked_not_medicine(monkeypatch):
    """Vision says it's not a medicine → found=false."""
    monkeypatch.setenv("GROQ_API_KEY", "test-key-xyz")
    monkeypatch.delenv("AYBOLIT_LOCAL", raising=False)
    ocr = MedicationOCR()

    fake_completion = MagicMock()
    fake_completion.choices = [MagicMock()]
    fake_completion.choices[0].message.content = json.dumps({"found": False})
    fake_client = MagicMock()
    fake_client.chat.completions.create.return_value = fake_completion

    with patch("api.ocr.Groq", return_value=fake_client):
        result = ocr.extract_from_image(_make_test_image_bytes(), "image/jpeg")

    assert result["found"] is False


# ─────────────────────────────────────────────────────────────
# /ocr endpoint tests — size + format validation
# ─────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    return TestClient(app)


def test_ocr_endpoint_invalid_format(client):
    """PDF (or any non-image type) → 415 Unsupported Media Type."""
    img_bytes = b"%PDF-1.4 not really a pdf"
    response = client.post(
        "/ocr",
        files={"file": ("test.pdf", img_bytes, "application/pdf")},
    )
    assert response.status_code == 415


def test_ocr_endpoint_too_large(client):
    """File over 5MB → 413."""
    # 6 MB of zeros — fakes a JPEG by content-type only
    big = b"\x00" * (6 * 1024 * 1024)
    response = client.post(
        "/ocr",
        files={"file": ("big.jpg", big, "image/jpeg")},
    )
    assert response.status_code == 413


def test_ocr_endpoint_empty_file(client):
    """0-byte file → 400."""
    response = client.post(
        "/ocr",
        files={"file": ("empty.jpg", b"", "image/jpeg")},
    )
    assert response.status_code == 400
