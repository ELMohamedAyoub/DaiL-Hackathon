# TODOS

## C08 reconciliation: negation inverts the extractor

**What:** The narrative-vs-register reconciliation layer anchors numbers near participant/attendance words and flags conflicts. It has no negation handling, so "we did NOT train twenty" anchors on "twenty" and fires a spurious conflict against the register.

**Why:** Real coordinator voice notes will phrase corrections/denials this way. Left unhandled, every negated figure becomes a redundant partner question.

**Pros of fixing:** Fewer noise questions sent to partners; cleaner report for the reviewer.

**Cons of fixing:** Negation detection is itself unreliable text parsing (same class of risk as the original keyword-lexicon trap this rewrite was built to avoid) — could trade one false-negative class for another.

**Context:** Accepted tradeoff from the C08 evidence-ambiguity design review (2026-09-17). The redundant question is low-cost: it always carries the source text verbatim, so a reviewer sees the negation immediately and can dismiss it in one glance. Revisit if Wolf's real evidence-ingestion adapter shows this firing often enough to be annoying rather than rare.

**Depends on / blocked by:** Nothing — independent follow-up to the evidence-class-table + reconciliation rewrite in `backend/app/rules/c08_report.py`.

## C08 ask-about-report: citation validation

**Resolved.** `backend/app/routers/c08_ask.py` now extracts every evidence-ID-shaped token from the model's answer and checks each one against the real evidence set for that programme; any answer citing an ID that doesn't exist is withheld and replaced with a fixed, honest refusal message rather than shown as-is. The claim-construction path (`c08_report.py`) still has no model dependency at all; this validation only guards the separate, downstream Q&A layer.

**Remaining gap, lower priority:** citation IDs are checked, but a cited number attached to a real ID is not cross-checked against that record's actual value. Low risk given the system prompt's instruction to answer only from the supplied JSON and the model's demonstrated behavior in testing, but not a structural guarantee the way the ID check is.

**Depends on / blocked by:** Nothing; independent of the negation-handling TODO above.
