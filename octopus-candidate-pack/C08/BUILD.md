# C08 evidence-linked report prototype

This vertical slice generates a participation report without turning targets into attendance or attendance into completion. One labeled simulation trigger loads the evidence and opens a result-first reviewer brief; detailed rules and raw sources remain available below it. A named reviewer can approve the wording or request evidence; reviewer actions do not alter its claims.

## Run it

Use Python 3.11 and Node.js with the existing lockfiles.

```bash
# Terminal 1: API on http://localhost:8461
cd backend
uv sync
./dev.sh

# Terminal 2: UI on http://localhost:4927/c08
cd frontend
npm install
npm run dev
```

If the API runs elsewhere, start the frontend with `NEXT_PUBLIC_API_URL=http://host:port npm run dev`.

## Real in the prototype vs simulated

- Implemented: a pure deterministic report builder reads the unchanged C08 `initial.json` and separates attendance, planned capacity, missing completion evidence, and the excluded ambiguous transcript.
- Implemented: narrative evidence (e.g. voice-note transcripts) is cross-checked against plan and attendance values, kept visible, and routed to review when it agrees, differs, or cannot be compared. It remains non-authoritative and never becomes a numeric citation. Classification is driven by evidence type, not a hardcoded narrative ID.
- Implemented: `GET /programmes` exposes three selectable cases. `PRG-SYN` is the official unchanged exercise record. `PRG-NOASSESS` and `PRG-DOUBLE` are clearly labelled demo-only files under `demo-cases/`; they exercise missing-assessment and multiple-narrative-record paths without altering the official file.
- Implemented: one labeled simulation trigger loads the exact raw records and immediately presents a plain-language reviewer brief. The rules, comparison detail, and evidence ledger remain available as the audit trail.
- Implemented: the report includes a three-source comparison, evidence-linked claim ledger, narrative context, deterministic partner questions, and browser print/save-as-PDF export. Raw source text remains inspectable from the report.
- Implemented: approve and send-back endpoints change in-memory reviewer state only. Each simulated action is appended to the visible review-history timeline with reviewer, detail, and timestamp.
- Simulated: all exercise data, programme, named reviewer “Maya El Idrissi,” and human approve/send-back actions.
- Not implemented: authentication, durable reviewer state or history, source ingestion, transcript verification, assessment collection, PDF generation service, or publication workflow.

Current limitation: approval, send-back, and history state are held in API process memory and reset when the server restarts. The prototype validates report semantics and evidence traceability, not the truth of synthetic source records.

## Next validation test

Give a consented, redacted report pack containing a plan, attendance register, ambiguous narrative note, and optional completion assessment to two programme reviewers. Success means both independently identify the same hard claims and sources, refuse completion when the assessment is absent, and understand that approval changes status only.

See `DATA_READINESS.md` for the current data inventory, the required variation matrix, and the minimum ingestion contract.
