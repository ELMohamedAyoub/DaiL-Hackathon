# C08 evidence-linked report prototype

This vertical slice generates a participation report from `initial.json` without turning targets into attendance or attendance into completion. A named reviewer can approve visibility of the draft; approval does not alter its claims.

## Run it

Use Python 3.11 and Node.js with the existing lockfiles.

```bash
# Terminal 1 — API on http://localhost:8461
cd backend
uv sync
./dev.sh

# Terminal 2 — UI on http://localhost:4927/c08
cd frontend
npm install
npm run dev
```

If the API runs elsewhere, start the frontend with `NEXT_PUBLIC_API_URL=http://host:port npm run dev`.

## Real in the prototype vs simulated

- Implemented: a pure deterministic report builder reads the unchanged C08 `initial.json` and separates attendance, planned capacity, missing completion evidence, and the excluded ambiguous transcript.
- Implemented: `GET /programmes/PRG-SYN/report` returns the report and `POST /programmes/PRG-SYN/report/approve` changes only its status and simulated approval metadata.
- Implemented: the UI reveals raw source text for every displayed claim and clearly labels VOICE-A as excluded from numeric citations.
- Implemented: the report builder also returns partner_questions, a list of template-derived questions to ask the evidence partner (e.g. 'Please submit the completion assessment for Exercise week 1.'), derived only from existing flagged_evidence and completion_claim data, with no LLM involved, fully deterministic and tested.
- Simulated: all exercise data, programme, named reviewer “Maya El Idrissi,” and human approval action.
- Not implemented: authentication, durable approval history, source ingestion, transcript verification, assessment collection, or publication workflow.

Current limitation: approval state is held in API process memory and resets when the server restarts. The prototype validates report semantics and evidence traceability, not the truth of synthetic source records.

## Next validation test

Give a consented, redacted report pack containing a plan, attendance register, ambiguous narrative note, and optional completion assessment to two programme reviewers. Success means both independently identify the same hard claims and sources, refuse completion when the assessment is absent, and understand that approval changes status only.
