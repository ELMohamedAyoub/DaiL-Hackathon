# Prototype handoff

Case: C08. Candidate/team: solo build, Octopus Day 2026-09-17. Prototype location: `backend/app/rules/c08_report.py`, `backend/app/routers/c08.py`, `frontend/src/app/c08`.

## The problem we validated

Actor, painful moment and consequence: a programme reporting officer receives a plan target, an attendance sheet, and a coordinator's voice note that disagree, plus an assessment record that may or may not confirm completion. Under deadline pressure the officer is at risk of reporting whichever number looks best, or quietly treating a target as an actual, or claiming completion nobody verified. The consequence is a report a funder later cannot trust.

Client evidence: the brief's own client quote (`octopus-candidate-pack/C08/brief.md`) and the supplied `initial.json` (PLAN-A target 20, SHEET-A attendance 12, VOICE-A self-correcting voice note, ASSESS-A assessment record). No live client interview took place: the Octopus harness (the event's chat-based client-interview channel) was unreachable for this session's entire working window. The brief's own supplied client dialogue and rule set were used as the interview answer instead, per the exercise's own allowance to use a labeled local simulation when a service is unavailable. This is disclosed, not hidden.

What the client changed in our understanding: see `PAIN_FEEDBACK_CHANGES.md` for the full record. In short: the voice note was first excluded from the report and left out of any comparison; feedback (documented as the client reaction to that first cut) was that it should not feel ignored, so a deterministic cross-check was added that compares it against the plan and attendance without ever citing it as a number. A later pass found the multi-step reveal read as system ceremony rather than a decision aid, so the flow was cut to one click that leads with the reviewer's decision, not the report machinery.

What remains an assumption: that real reporting officers reach a correct decision faster with this report than with the raw three documents, and that the deterministic claim-construction approach generalizes past the four evidence records supplied. See `DATA_READINESS.md` for exactly what would need to be tested to know.

## Open and demonstrate it

Exact run instructions and start state: `BUILD.md`. Backend `uv run uvicorn app.main:app --reload --env-file .env` on the port set in `backend/.env`, frontend `npm run dev` on `:4927`, open `http://localhost:4927/c08`. Selecting a case and reloading always returns to a clean, unapproved draft; server-side state resets on backend restart.

Ordinary path: select `PRG-SYN` (the official record), trigger the labeled simulated submission. The reviewer brief appears immediately, leading with "12 attended, 20 was the target, completion is unknown." Attendance (SHEET-A) and capacity target (PLAN-A) are shown as separate claims, each citing its source record.

Changed-information path: the voice note (VOICE-A) mentions 20, matching the plan target and differing from attendance. The three-source cross-check shows this comparison explicitly, flagged `needs-review`, and stays non-authoritative: it can corroborate a value or expose a discrepancy, but it never becomes a numeric citation. The reviewer can request more evidence with a required reason (a real audit/RFI pattern) or approve the wording; either action appends to a visible, append-only review-history timeline without altering any generated claim.

Failure or uncertainty path: completion is rendered as an explicit "not stated, see source assessment record", never inferred from the assessment's content and never a blank. Switch to the `PRG-NOASSESS` demo case to see the same logic when no assessment record exists at all, and `PRG-DOUBLE` to see two separate ambiguous narrative records both correctly excluded by evidence type, not by a hardcoded record ID. Stopping the API and reloading gives a specific recovery instruction rather than a silent failure.

## What is real

| Component | Implemented or simulated | Evidence and limitation |
| --- | --- | --- |
| Input and event trigger | Simulated | The "simulate submission" button loads unchanged synthetic `initial.json` (official) or a clearly labeled `demo-cases/` file; no real evidence intake exists. |
| Retrieval / reasoning | Implemented | Pure deterministic Python: evidence classified by type, narrative records excluded by type not by ID, numeric values from a fixed known-ID lookup (never parsed from free text), a rules-derived partner-question generator, and a narrative-vs-register number-mention cross-check. No LLM in claim construction; deliberately evaluated and rejected (`TODOS.md`, `PRODUCT.md`). |
| Ask about report | Implemented | One deliberate, downstream LLM touchpoint (DeepSeek): answers a free-text question using only the already-computed report JSON, must cite an evidence_id per claim, refuses when the report doesn't state something. No programmatic re-validation of its citations yet; relies on the prompt's instructions alone. |
| Human review | Simulated | Named reviewer approve/send-back actions change in-memory status only, never a generated claim, and append to a visible history. No real identity/auth. |
| External action | Not implemented | Export uses the browser's native print/save-as-PDF; no email, ticket, or partner-facing system is contacted. |
| Persistence and history | Partial | Review history is append-only within a running process but held in memory; restarting the API clears it. No durable store. |

## Next client validation

One real case we would test: a consented, redacted real reporting pack (plan, attendance register, narrative note, completion assessment) reviewed independently by two programme officers, per the fuller 8-12-pack plan in `DATA_READINESS.md`. What counts as success: both reviewers independently identify the same supported claims and sources, both decline to state completion when the assessment is absent, and both agree the generated partner questions are the right ones to send. Who evaluates it: client programme-assurance lead, with the Wolf integration lead present to capture schema gaps.

## Wolf work

Required integration and permission: a client-controlled evidence-ingestion adapter that emits immutable evidence IDs, exact source spans, evidence types, reporting periods, and access-controlled file references. Requires a consented redacted test pack, read-only document-store credentials, reporting schema documentation, a named-reviewer identity provider sandbox, and a non-production report store.

Data boundary and model processing location: source documents stay in the client-controlled environment; only required claims, immutable references, and source spans reach the report service. No model or service outside that boundary ever sees raw source documents. Ambiguous or missing evidence must remain visible and must never be coerced into a hard number.

Failure/recovery plan: if ingestion cannot classify a record's evidence type, it is preserved and routed to manual classification rather than dropped or guessed. If a numeric value cannot be safely extracted, the claim is omitted, never fabricated, matching current behavior for unknown evidence IDs.

Monitoring owner: client programme-assurance lead.

Ask-about-report at real scale: `backend/app/routers/c08_ask.py` currently passes the whole evidence set for a programme directly in the prompt, which is strictly correct while a case has a handful of records. Real client portfolios will have far more evidence per programme than fits in one context window. `backend/app/prototypes/c08_evidence_vector_prototype.py` is a working, local, no-external-dependency prototype of the retrieval step that would replace "pass everything" once that's true: embeds each evidence record, returns the top-k relevant to a question. It is deliberately not wired into the live endpoint yet -- there is nothing to retrieve from today that isn't already in every prompt. The citation-validation guardrail already in `c08_ask.py` does not change when this is wired in; it checks the answer against real evidence IDs regardless of how those IDs were surfaced to the model. Next step when real ingestion volume is known: point this at a durable Chroma instance (already wired in `settings.py` for the C07 vectors router) with re-indexing on ingestion, not per-request as the prototype does for simplicity.

Scope and effort drivers: the width of the evidence-type taxonomy the client actually produces, whether structured numeric extraction (not present today) is in scope, and whether multi-programme/multi-period isolation is needed for the client's real portfolio size. No invented price or delivery commitment.

Open risks: duplicate participant resolution across sources, period misalignment, altered or superseded source records, transcript negation/correction (documented gap, `TODOS.md`), assessment-version drift, unauthorised approval (no real auth in this prototype), and the current in-memory-only history losing state on restart.

Next action and owner: Wolf integration lead maps the client's real evidence schema to this report contract and schedules the two-reviewer validation above with the programme-assurance owner.
