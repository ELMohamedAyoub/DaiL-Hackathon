# Prototype handoff

Case: C07. Prototype location: `/backend/app/rules/readiness.py`, `/backend/app/routers/readiness.py`, and `/frontend/src/app/c07`.

## The problem we validated

An application reviewer needs a fast, evidence-linked view of missing and ambiguous records before beginning human review. The supplied C07 rules and synthetic cases are the evidence; performance on real documents remains an assumption.

## Open and demonstrate it

Run the API and UI using `BUILD.md`, then open `http://localhost:4927/c07`.

- Ordinary near-miss: simulate APP-1 and show the single missing signoff plus the locked source spelling note.
- Changed-information path: simulate APP-2 and show the organisation mismatch alongside both missing items.
- Failure path: stop the API and trigger a case; the UI gives a specific recovery instruction.

## What is real

| Component | Implemented or simulated | Evidence and limitation |
| --- | --- | --- |
| Input and trigger | Simulated | Buttons request the two synthetic application IDs. |
| Rule evaluation | Implemented | Pure deterministic function over the unchanged source JSON. |
| Human review | Simulated | Named synthetic reviewer and browser-local acknowledgement only. |
| External action | Not implemented | No downstream case-management connection. |
| Persistence and history | Not implemented | Reloading clears acknowledgements. |

## Next client validation

Test one consented real registration document and associated application. Success means the reviewer can trace every extracted field, finds no omitted required item, and agrees with every surfaced mismatch. Evaluation owner: client-side review operations lead.

## Wolf work

Next integration: a real document-extraction pipeline that emits source spans, document type, organisation value, and confidence. Access requirements: a consented redacted test set, read-only document-store credentials, schema documentation, and a non-production case-management sandbox.

Data boundary: source documents remain in the client-controlled environment; only required extracted fields should reach the rules service. Failed or low-confidence extraction must route to manual clarification and preserve the original file reference.

Owner: Wolf integration lead. Monitoring owner: client review-operations lead.

Open risks: false-negative mismatch detection, name-normalisation and transliteration edge cases, OCR omissions, stale documents, uncertain signatory identity, and missing durable audit history.

Next action: Wolf integration lead maps the extraction output schema to the readiness endpoint and schedules the consented OCR validation with the review-operations owner.
