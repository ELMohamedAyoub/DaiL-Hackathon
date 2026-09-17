# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: a programme reporting officer at an NGO/foundation, compiling a progress report from mixed evidence (attendance sheets, plan/target documents, coordinator voice notes, completion assessments) under deadline pressure. Secondary: a named reviewer who approves or sends back the draft report before it goes to a funder or manager. (Inferred from `octopus-candidate-pack/C08/brief.md` and the simulated reviewer "Maya El Idrissi" already in the prototype.)

## Product Purpose

Turns mixed, sometimes-contradictory evidence (a plan target, an attendance register, an ambiguous field note, a possibly-missing assessment) into a reviewable progress report that states what is supported, what is uncertain, and what to ask the evidence partner next, without polishing away that uncertainty. Success is a report a reviewer can trust because every number traces to a specific source record, and nothing is inferred that the evidence does not actually say.

## Positioning

Deterministic, rule-based claim construction, not an LLM summarizer. The differentiator over a typical "AI report generator" is refusal: it will not average a target into an actual, will not resolve an ambiguous voice note into a confident number, and will not fabricate a citation for a claim it cannot support. Uncertainty stays visible instead of being smoothed into a clean-looking report. (Confirmed via this session's design decisions: LLM use was explicitly evaluated and rejected for the claim-construction path; see backend/app/rules/c08_report.py and its evidence-class-table design.)

## Operating Context

A named reviewer opens the report desk, triggers a simulated evidence submission (loads the fixed synthetic evidence set), reviews a claim ledger where every number cites its source record, reads excluded/ambiguous evidence verbatim, sees generated follow-up questions for the evidence partner, and either approves the report (status only, not the claims) or sends it back for more evidence with a reason. This is a synthetic hackathon exercise (Octopus Day, 6-hour build) for a fictional client, not a live production tool. (Confirmed via `octopus-candidate-pack/C08/brief.md`, `BUILD.md`, `WOLF_HANDOFF.md`.)

## Capabilities and Constraints

- Confirmed: pure deterministic report builder (`backend/app/rules/c08_report.py`) reading a fixed synthetic `initial.json`; evidence classified by type (attendance/plan/assessment authoritative, everything else narrative and excluded from numeric claims); completion claim never asserts non-submission for content it hasn't parsed; simulated approve/send-back workflow with in-memory history; FastAPI backend + Next.js/Tailwind frontend.
- Explicitly not built (deferred, see TODOS.md and WOLF_HANDOFF.md): authentication, durable persistence (resets on API restart), real evidence ingestion, free-text value parsing from evidence records, narrative-vs-register reconciliation/escalation, any LLM in the claim-construction path (deliberate, not a gap).
- C07 (a related caseworker/applicant surface from the same hackathon pack) is explicitly out of scope for this product record — dropped per user instruction.

## Brand Commitments

No formal brand. Existing working identity: "C08 · Evidence report desk," sharp-corner design system (no rounded corners), single locked accent (teal, `--color-teal: #16766f`), functional (not decorative) color coding — amber for plan/target and draft status, danger-red for excluded/flagged evidence and send-back, teal for approved. Light mode only, by design. Display font recently changed from Fraunces to Space Grotesk (Fraunces was flagged as a common LLM-default tell); body font Manrope. Preserve this identity in further design work rather than reopening color/type choices.

## Evidence on Hand

Real: `octopus-candidate-pack/C08/initial.json` (4 synthetic evidence records: PLAN-A, SHEET-A, VOICE-A, ASSESS-A), `octopus-candidate-pack/C08/brief.md`, `BUILD.md`, `WOLF_HANDOFF.md`, `PRESENTATION_SCRIPT.md`. No real beneficiary data, no real client, explicitly stated as fictional/synthetic throughout the pack. Do not fabricate additional evidence records, real organization names, or real reviewer identities beyond what's in `initial.json` and the existing simulated reviewer name.

## Product Principles

1. Every numeric claim states its unit, period, and source evidence record (from `initial.json`'s own rule set) — never displayed without traceability.
2. Ambiguous or non-authoritative evidence (voice notes, field notes, anything not type-classified as attendance/plan/assessment) is shown, never silently folded into a hard number.
3. Approval is a visibility/status action only; it never alters or verifies the underlying claims.
4. No inference about outcomes (e.g. completion) from participation alone, and no fabricated citation for evidence that doesn't exist.
5. Deterministic over generative: refusal to state a fact beats a fluent guess, everywhere in this report.

## Accessibility & Inclusion

No product-specific requirement established beyond general WCAG AA expectations already reflected in the current implementation (focus-visible states, semantic form labeling). Judges may review on a single laptop screen; current build is responsive down to mobile per DESIGN.md's fast-wins checklist.
