# TODOS

## C08 reconciliation: negation inverts the extractor

**What:** The narrative-vs-register reconciliation layer anchors numbers near participant/attendance words and flags conflicts. It has no negation handling, so "we did NOT train twenty" anchors on "twenty" and fires a spurious conflict against the register.

**Why:** Real coordinator voice notes will phrase corrections/denials this way. Left unhandled, every negated figure becomes a redundant partner question.

**Pros of fixing:** Fewer noise questions sent to partners; cleaner report for the reviewer.

**Cons of fixing:** Negation detection is itself unreliable text parsing (same class of risk as the original keyword-lexicon trap this rewrite was built to avoid) — could trade one false-negative class for another.

**Context:** Accepted tradeoff from the C08 evidence-ambiguity design review (2026-09-17). The redundant question is low-cost: it always carries the source text verbatim, so a reviewer sees the negation immediately and can dismiss it in one glance. Revisit if Wolf's real evidence-ingestion adapter shows this firing often enough to be annoying rather than rare.

**Depends on / blocked by:** Nothing — independent follow-up to the evidence-class-table + reconciliation rewrite in `backend/app/rules/c08_report.py`.

## C08 ask-about-report: no programmatic citation validation

**What:** `backend/app/routers/c08_ask.py` instructs the model (via system prompt) to cite an evidence_id for every factual claim and to refuse when the report doesn't state something, but nothing checks the response afterward. A cited evidence_id that doesn't exist in the report, or a number that doesn't match, would currently reach the user unfiltered.

**Why it's still the right scope for this round:** this is the one deliberate LLM touchpoint in C08, deliberately downstream of and never feeding back into claim construction (`c08_report.py` stays untouched by it). Verified live against two representative questions (a supported fact, a genuinely unstated one) and it behaved correctly both times, but that is not the same as a structural guarantee.

**Fix if revisited:** parse the response, extract cited evidence_ids, assert each exists in the current report's evidence set, and fall back to a fixed refusal string on any mismatch, matching the validated-hybrid pattern discussed for the partner-questions generator (never shipped there either, for the same reason: not needed once templates covered every case deterministically).

**Depends on / blocked by:** Nothing; independent of the negation-handling TODO above.
