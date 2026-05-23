"""Retrieval-Augmented Generation for medication explanations.

The vector store holds chunked OpenFDA label text. At explain-time we
retrieve the chunks most relevant to (a) dosage, (b) safety/warnings,
and (c) interactions, and inject them as VERIFIED MEDICAL DATA into the
prompt so the LLM grounds its answer in real label text instead of
fabricating.

Two modes:
- ephemeral (default; Railway-friendly): in-memory ChromaDB rebuilt at
  every startup; embeddings stay in RAM only
- persistent (AYBOLIT_LOCAL=true): ChromaDB persisted to disk so embeds
  survive restarts and accumulate over time

The embedding model is multilingual (Armenian, Russian, English), small,
and runs fully locally — no embedding API calls per request.
"""
from __future__ import annotations

import hashlib
import logging
import os
from typing import Dict, List

import chromadb

logger = logging.getLogger("aybolit.rag")

# Multilingual model — supports Armenian, Russian, English natively.
# ~120 MB. Downloaded once into HF cache on first init.
EMBED_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

# Default persist dir for local mode. Override with AYBOLIT_CHROMA_PATH.
DEFAULT_CHROMA_PATH = "/tmp/aybolit_chroma"

# Chunking parameters
CHUNK_WORDS = 50  # ~300 chars
CHUNK_OVERLAP = 8  # ~50-char overlap


class MedicationRAG:
    """Vector store of OpenFDA medication facts with semantic retrieval."""

    def __init__(self, persist_local: bool = False):
        # Import sentence-transformers lazily — it's a heavy import (PyTorch)
        from sentence_transformers import SentenceTransformer

        self.embedder = SentenceTransformer(EMBED_MODEL)

        if persist_local:
            path = os.environ.get("AYBOLIT_CHROMA_PATH", DEFAULT_CHROMA_PATH)
            os.makedirs(path, exist_ok=True)
            self.chroma = chromadb.PersistentClient(path=path)
            self._mode = "persistent"
            logger.info(f"RAG: persistent ChromaDB at {path}")
        else:
            self.chroma = chromadb.EphemeralClient()
            self._mode = "ephemeral"
            logger.info("RAG: ephemeral (in-memory) ChromaDB")

        self.collection = self.chroma.get_or_create_collection(
            name="medications",
            metadata={"hnsw:space": "cosine"},
        )

    # ── Ingestion ──────────────────────────────────────────────
    def add_medication(self, drug_name: str, drug_data: dict) -> int:
        """Chunk OpenFDA label data and store. Returns number of new
        chunks added (skipped chunks that were already indexed are not
        counted)."""
        chunks = self._chunk_drug_data(drug_name, drug_data)
        if not chunks:
            return 0

        # De-dupe against existing IDs in a single get()
        ids = [self._chunk_id(drug_name, c["text"]) for c in chunks]
        existing = set()
        try:
            got = self.collection.get(ids=ids)
            existing = set(got.get("ids", []) or [])
        except Exception:
            pass

        new_ids: List[str] = []
        new_docs: List[str] = []
        new_metas: List[Dict] = []
        for cid, chunk in zip(ids, chunks):
            if cid in existing:
                continue
            new_ids.append(cid)
            new_docs.append(chunk["text"])
            new_metas.append({
                "drug_name": drug_name,
                "section": chunk["section"],
                "source": "OpenFDA",
                "language": "en",
            })

        if not new_ids:
            return 0

        embeddings = self.embedder.encode(new_docs).tolist()
        self.collection.add(
            ids=new_ids,
            embeddings=embeddings,
            documents=new_docs,
            metadatas=new_metas,
        )
        return len(new_ids)

    # ── Retrieval ──────────────────────────────────────────────
    def retrieve(self, query: str, drug_name: str, n: int = 5) -> List[Dict]:
        """Return the n most relevant chunks for this drug, ordered by
        relevance. Empty list if the collection is empty or no chunks
        exist for the drug."""
        if self.collection.count() == 0:
            return []

        query_embedding = self.embedder.encode(query).tolist()

        try:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=min(n, self.collection.count()),
                where={"drug_name": drug_name},
            )
        except Exception as e:
            logger.warning(f"RAG retrieve failed for {drug_name}: {e}")
            return []

        if not results.get("documents") or not results["documents"][0]:
            return []

        chunks: List[Dict] = []
        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i]
            distance = results["distances"][0][i] if results.get("distances") else 0.0
            chunks.append({
                "text": doc,
                "section": meta.get("section", ""),
                "source": meta.get("source", "OpenFDA"),
                "relevance": round(1.0 - distance, 3),
            })
        return chunks

    # ── Internal helpers ──────────────────────────────────────
    def _chunk_drug_data(self, drug_name: str, drug_data: dict) -> List[Dict]:
        """Split label data into semantic chunks. One section's text is
        further split into overlapping ~300-char windows so retrieval can
        pull just the relevant sentence rather than an entire warnings
        block."""
        # Map fetcher's keys → semantic sections we expose downstream
        sections = {
            "purpose": drug_data.get("purpose", ""),
            "dosage": drug_data.get("dosage", "") or drug_data.get("dosage_and_administration", ""),
            "warnings": drug_data.get("warnings", ""),
            "side_effects": drug_data.get("side_effects", "") or drug_data.get("adverse_reactions", ""),
            "interactions": drug_data.get("drug_interactions", ""),
            "contraindications": drug_data.get("contraindications", ""),
            "pregnancy": drug_data.get("pregnancy", ""),
            "indications": drug_data.get("indications", ""),
        }

        chunks: List[Dict] = []
        for section, text in sections.items():
            if not text or len(text.strip()) < 20:
                continue
            words = text.split()
            step = max(1, CHUNK_WORDS - CHUNK_OVERLAP)
            for i in range(0, len(words), step):
                window = " ".join(words[i:i + CHUNK_WORDS])
                if len(window) < 20:
                    continue
                chunks.append({
                    "text": f"{drug_name} {section}: {window}",
                    "section": section,
                })
                if i + CHUNK_WORDS >= len(words):
                    break
        return chunks

    @staticmethod
    def _chunk_id(drug_name: str, text: str) -> str:
        return hashlib.md5(f"{drug_name}::{text}".encode("utf-8")).hexdigest()

    # ── Inspection ────────────────────────────────────────────
    def get_stats(self) -> Dict:
        return {
            "total_chunks": self.collection.count(),
            "mode": self._mode,
            "embed_model": EMBED_MODEL,
        }
