# C08 data readiness: what we have and what we still need

## Decision

The supplied data is **enough for the prototype demonstration**, but **not enough to validate the workflow for real use**.

It proves one narrow promise: the report can keep a plan target separate from attendance, exclude an ambiguous narrative from numeric claims, and avoid inferring completion. It does not yet prove that the system handles the range, quality, and failure modes of real programme evidence.

## Data currently available

### Official exercise input

`initial.json` contains one synthetic programme, one reporting period, and four evidence records:

| Evidence type | Example | What it can support | Current treatment |
| --- | --- | --- | --- |
| `plan` | PLAN-A: capacity target of 20 | Planned capacity only | Authoritative for a target, never attendance |
| `attendance` | SHEET-A: 12 unique attendees | Participation count | Authoritative for attendance |
| `voice-note-transcript` | VOICE-A: ambiguous reference to 20 | Context and a follow-up question | Visible but excluded from numeric claims |
| `assessment` | ASSESS-A: no assessment submitted | Presence of an assessment-type record | Shown verbatim; completion remains unstated |

The same file also supplies one reviewer note and three reporting rules. All of it is synthetic; there are no original spreadsheets, documents, audio files, participant rows, or real client records.

### Additional demo-only inputs

Two clearly separated simulated cases exercise:

- an entirely absent assessment record (`PRG-NOASSESS`);
- two narrative records of different types (`PRG-DOUBLE`).

These improve the demonstration, but they are not validation data and must not be presented as supplied client evidence.

## Important implementation constraint

The current engine classifies evidence by `type`, which is a useful general rule. However, numeric values are not extracted from structured fields or source documents: they are mapped from six known demo record IDs in `_KNOWN_VALUES`.

That means a new attendance record such as `SHEET-B` is safely omitted rather than guessed, even if its text contains a number. This is responsible prototype behaviour, but it also means the current system is not yet a general ingestion pipeline.

## Varied entries needed next

Use a consented, redacted client test pack. Keep each case as a separate fixture with an expected reviewer decision.

| Priority | Variation | Why it matters | Expected safe behaviour |
| --- | --- | --- | --- |
| P0 | Structured attendance rows with stable participant IDs | Tests deduplication and the meaning of “unique attendee” | Produce a count with row-level provenance |
| P0 | Plan and attendance from different reporting periods | Prevents a valid number being attached to the wrong report | Flag period mismatch; do not combine |
| P0 | Missing, blank, malformed, and duplicate records | Real intake is rarely complete | Continue safely and show a specific exception |
| P0 | Two attendance sources with conflicting totals | Tests authority and reconciliation | Show the conflict; require reviewer choice/correction |
| P0 | Positive, partial, and superseded assessment versions | Tests completion without inferring outcomes | Use only the agreed version and preserve provenance |
| P1 | Revised plan/target after the period starts | Tests versioning and target drift | Show original and revised target with effective dates |
| P1 | Different units: people, sessions, organisations, hours | Prevents category errors | Reject or separately label incompatible units |
| P1 | Transcript with correction or negation | Tests “twenty, actually twelve” and “did not train twenty” | Keep narrative non-authoritative; generate a precise question |
| P1 | Unknown document/evidence type | Tests forward compatibility | Preserve and route to manual classification |
| P1 | OCR errors and low-confidence extracted values | Tests document ingestion risk | Surface confidence/source span; never silently assert |
| P2 | Multiple programmes, partners, and periods | Tests isolation and scale | Never mix evidence across programme/partner/period |
| P2 | Access-restricted or withdrawn evidence | Tests governance | Remove access without erasing the audit reference |

## Minimum input contract for the next prototype

Each ingested evidence record should provide:

- immutable `evidence_id` and `programme_id`;
- `evidence_type` from an agreed taxonomy;
- `reporting_period` and, where relevant, an effective/version date;
- structured metric, value, and unit for authoritative numeric records;
- exact source reference and source span (sheet/cell, page/line, or transcript timestamps);
- ingestion timestamp, version, and supersedes relationship;
- extraction method and confidence when machine-extracted;
- consent/access classification and current availability;
- original text or a client-controlled file reference;
- validation status and reviewer correction, without overwriting the original.

Participant-level personal data should remain in the client-controlled environment. The report service only needs the minimum derived fields and immutable references required for traceability.

## Practical next test

Ask the client for 8–12 consented, redacted reporting packs chosen for variation, not convenience. Include at least two clean packs and one pack for each P0 condition above. Two programme reviewers should independently state:

1. which numeric claims are safe to report;
2. which source and source span supports each claim;
3. which conflicts or missing items require follow-up;
4. whether they agree with the prototype's output.

Success is agreement on every published claim and its source, zero unsupported completion claims, and useful follow-up questions for every blocked claim. This validates decision quality; a larger later sample is still needed for operational reliability.

## Client-facing explanation

“The current sample is deliberately small, and it is enough to show the safety behaviour: targets do not become attendance, and attendance does not become completion. Before integration, we need a small but deliberately varied redacted pack, not simply more rows, to test duplicates, conflicts, period changes, revised documents, and missing evidence. Until that test passes, the prototype demonstrates the workflow, not production accuracy.”
