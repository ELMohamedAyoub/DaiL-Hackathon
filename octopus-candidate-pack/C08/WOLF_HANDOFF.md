# Prototype handoff

Case: C08. Prototype location: `/backend/app/rules/c08_report.py`, `/backend/app/routers/c08.py`, and `/frontend/src/app/c08`.

## The problem we validated

A programme reviewer needs an evidence-linked report that distinguishes attendance from a capacity target and refuses to infer completion without an assessment. The supplied C08 synthetic evidence validates deterministic claim construction; performance with real records remains an assumption.

## Open and demonstrate it

Run the API and UI using `BUILD.md`, then open `http://localhost:4927/c08`.

- Show that attendance is 12 participants for Exercise week 1 from SHEET-A, while 20 participants is separately labelled as a PLAN-A target.
- Reveal every raw source and show that VOICE-A is flagged as self-correcting, ambiguous, and excluded from numeric citations.
- Show completion as “not stated — no assessment submitted” from ASSESS-A.
- Use the simulated named-reviewer button and show that only the draft/approved stamp changes.
- Failure path: stop the API and reload; the UI gives a specific recovery instruction.

## What is real

| Component | Implemented or simulated | Evidence and limitation |
| --- | --- | --- |
| Input | Simulated | Unchanged synthetic `initial.json` is the sole source. |
| Report rules | Implemented | Pure deterministic construction with explicit evidence IDs. |
| Evidence inspection | Implemented | Exact supplied text is available from every claim card. |
| Human approval | Simulated | Named reviewer action changes in-memory status only. |
| Persistence and publication | Not implemented | Restarting the API clears approval; no report is externally published. |

## Next client validation

Test a consented, redacted real reporting pack with two programme reviewers. Success means both trace every numeric claim to the same record, distinguish capacity from attendance, and decline to state completion when the assessment is absent. Evaluation owner: client programme-assurance lead.

## Wolf work

Next integration: a client-controlled evidence ingestion adapter that emits immutable evidence IDs, exact source spans, evidence types, reporting periods, and access-controlled file references.

Access requirements: a consented redacted test pack, read-only document-store credentials, reporting schema documentation, named-reviewer identity provider sandbox, and a non-production report store.

Data boundary: source documents remain client-controlled; only required claims, immutable references, and source spans reach the report service. Ambiguous or missing evidence must remain visible and must never be coerced into a hard number.

Owner: Wolf integration lead. Monitoring owner: client programme-assurance lead.

Open risks: duplicate participant resolution, period misalignment, altered source records, transcript ambiguity, assessment-version drift, unauthorised approval, and missing durable audit history.

Next action: Wolf integration lead maps the client evidence schema to the report contract and schedules the two-reviewer validation with the programme-assurance owner.
