# TODOS

## C08 reconciliation: negation inverts the extractor

**What:** The narrative-vs-register reconciliation layer anchors numbers near participant/attendance words and flags conflicts. It has no negation handling, so "we did NOT train twenty" anchors on "twenty" and fires a spurious conflict against the register.

**Why:** Real coordinator voice notes will phrase corrections/denials this way. Left unhandled, every negated figure becomes a redundant partner question.

**Pros of fixing:** Fewer noise questions sent to partners; cleaner report for the reviewer.

**Cons of fixing:** Negation detection is itself unreliable text parsing (same class of risk as the original keyword-lexicon trap this rewrite was built to avoid) — could trade one false-negative class for another.

**Context:** Accepted tradeoff from the C08 evidence-ambiguity design review (2026-09-17). The redundant question is low-cost: it always carries the source text verbatim, so a reviewer sees the negation immediately and can dismiss it in one glance. Revisit if Wolf's real evidence-ingestion adapter shows this firing often enough to be annoying rather than rare.

**Depends on / blocked by:** Nothing — independent follow-up to the evidence-class-table + reconciliation rewrite in `backend/app/rules/c08_report.py`.
