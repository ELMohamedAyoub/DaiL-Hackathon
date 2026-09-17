"""Prototype: vector retrieval over evidence records, for a scale this
hackathon's data doesn't have yet.

NOT wired into the live /ask endpoint (app/routers/c08_ask.py). That
endpoint passes the full evidence set (currently 3-5 records per case)
directly in the prompt, which is strictly better than retrieval when the
whole corpus already fits in one context window -- retrieval can only
ever show the model a subset of what it already sees today.

This module exists to demonstrate the pattern for the scenario Wolf's real
ingestion integration will actually hit: hundreds of evidence records per
programme, too many to put in one prompt. See WOLF_HANDOFF.md for the
handoff note. When that's real, this becomes the retrieval step upstream
of the same citation-validation guardrail already in c08_ask.py -- the
guardrail doesn't change, only how the model gets shown the evidence does.

Runs fully local: chromadb's ephemeral in-memory client with its default
on-device embedding function, no API key, no network call. A real
deployment would point at a durable Chroma instance (already wired in
settings.py for the C07 vectors router) and re-index on evidence ingestion,
not per-request as this prototype does for simplicity.

Run it directly:
    uv run python -m app.prototypes.c08_evidence_vector_prototype
"""

import chromadb

from app.routers.c08 import load_source_data


def build_evidence_index(programme_id: str) -> chromadb.Collection:
    client = chromadb.EphemeralClient()
    collection = client.get_or_create_collection(f"c08-evidence-{programme_id}")

    data = load_source_data(programme_id)
    collection.add(
        ids=[item["id"] for item in data["evidence"]],
        documents=[item["text"] for item in data["evidence"]],
        metadatas=[{"type": item["type"]} for item in data["evidence"]],
    )
    return collection


def retrieve_relevant_evidence(programme_id: str, question: str, k: int = 3) -> list[dict]:
    """The k evidence records most relevant to a free-text question. This is
    what would replace 'pass the whole report JSON in the prompt' once the
    evidence set is too large for one context window -- the citation
    validation in c08_ask.py stays exactly as-is either way, since it checks
    the answer against real evidence IDs regardless of how those IDs were
    surfaced to the model."""
    collection = build_evidence_index(programme_id)
    k = min(k, collection.count())
    if k == 0:
        return []
    results = collection.query(query_texts=[question], n_results=k)
    return [
        {"id": id_, "type": meta["type"], "text": doc}
        for id_, doc, meta in zip(
            results["ids"][0], results["documents"][0], results["metadatas"][0]
        )
    ]


if __name__ == "__main__":
    for demo_question in [
        "How many people attended?",
        "Was the programme completed?",
        "What does the voice note say?",
    ]:
        hits = retrieve_relevant_evidence("PRG-SYN", demo_question, k=2)
        print(f"\nQ: {demo_question}")
        for hit in hits:
            print(f"  [{hit['id']}] ({hit['type']}) {hit['text'][:80]}")
