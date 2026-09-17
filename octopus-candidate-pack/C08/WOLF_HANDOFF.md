# Prototype handoff

Case: C08. Prototype location: `/backend/app/rules/c08_report.py`, `/backend/app/routers/c08.py`, and `/frontend/src/app/c08`.

## The problem we validated

A programme reviewer needs an evidence-linked report that distinguishes attendance from a capacity target and refuses to infer completion without an assessment. The supplied C08 synthetic evidence validates deterministic claim construction; performance with real records remains an assumption.

## Open and demonstrate it

Run the API and UI using `BUILD.md`, then open `http://localhost:4927/c08`.

- Select `PRG-SYN`, the official record, and trigger the labeled simulated submission. The reviewer brief appears immediately; the raw arrivals, rule checks, comparison detail, and source ledger remain inspectable below it.
- Show that attendance is 12 participants for Exercise week 1 from SHEET-A, while 20 participants is separately labelled as a PLAN-A target.
- Show the three-source cross-check: VOICE-A's reference to 20 matches PLAN-A's target and differs from SHEET-A's attendance of 12. It stays visible and triggers review, but remains non-authoritative and never becomes a numeric citation.
- Show completion as "not stated, see source assessment record". The claim never characterizes the assessment's content, so it stays true whether ASSESS-A says nothing was submitted or reports something else entirely.
- Show the deterministic partner questions tied to the assessment record and excluded narrative evidence.
- Request evidence with a reason, then approve the wording. Show that the current reviewer state changes and both actions remain in the in-memory review-history timeline while the generated claims stay unchanged.
- Use `Export report (print / save as PDF)` to open the browser print view.
- Return to the case selector and point out `PRG-NOASSESS` and `PRG-DOUBLE`. Both are demo-only cases, stored separately to prove the same rules handle no assessment record and two ambiguous narrative records.
- Failure path: stop the API and reload; the UI gives a specific recovery instruction.

## What is real

| Component | Implemented or simulated | Evidence and limitation |
| --- | --- | --- |
| Input | Simulated | Unchanged synthetic `initial.json` is the official source; two separate `demo-cases/` files exercise additional paths. |
| Report rules | Implemented | Pure deterministic construction with explicit evidence IDs. |
| Evidence inspection | Implemented | Exact supplied text is available from every claim card. |
| Partner questions | Implemented | Template-derived questions use completion and excluded-evidence state; no LLM is involved. |
| Human review | Simulated | Named reviewer approve/send-back actions change in-memory state only and append to visible history. |
| Export | Implemented | The UI invokes browser print/save as PDF; no PDF service or publication occurs. |
| Persistence and publication | Not implemented | Restarting the API clears reviewer state and history; no report is externally published. |

## Next client validation

Test a consented, redacted real reporting pack with two programme reviewers. Success means both trace every numeric claim to the same record, distinguish capacity from attendance, and decline to state completion when the assessment is absent. Evaluation owner: client programme-assurance lead.

## Wolf work

Next integration: a client-controlled evidence ingestion adapter that emits immutable evidence IDs, exact source spans, evidence types, reporting periods, and access-controlled file references.

Access requirements: a consented redacted test pack, read-only document-store credentials, reporting schema documentation, named-reviewer identity provider sandbox, and a non-production report store.

Data boundary: source documents remain client-controlled; only required claims, immutable references, and source spans reach the report service. Ambiguous or missing evidence must remain visible and must never be coerced into a hard number.

Owner: Wolf integration lead. Monitoring owner: client programme-assurance lead.

Open risks: duplicate participant resolution, period misalignment, altered source records, transcript ambiguity, assessment-version drift, unauthorised approval, and missing durable audit history.

Next action: Wolf integration lead maps the client evidence schema to the report contract and schedules the two-reviewer validation with the programme-assurance owner.
