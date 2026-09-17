# C07 review-readiness prototype

This vertical slice checks whether supplied evidence is ready to route to a human reviewer. Case facts come only from `initial.json`; the rule evaluation is deterministic and the tool does not make an application outcome decision.

## Run it

Use Python 3.11 and Node.js with the existing lockfiles.

```bash
# Terminal 1 — API on http://localhost:8461
cd backend
uv sync
./dev.sh

# Terminal 2 — UI on http://localhost:4927/c07
cd frontend
npm install
npm run dev
```

If the API runs elsewhere, start the frontend with `NEXT_PUBLIC_API_URL=http://host:port npm run dev`.

## Real in the prototype vs simulated

- Implemented: FastAPI loads the unchanged `initial.json`, applies RULE-1 and RULE-2, and returns typed evidence reports at `GET /applications/{application_id}/readiness`.
- Implemented: the UI fetches those reports live and shows missing documents separately from record mismatches.
- Simulated: the application-arrival buttons, synthetic reviewer “Maya El Idrissi,” browser-local acknowledgement time, and all case data.
- Not implemented: document ingestion, OCR/extraction, identity resolution, authentication, durable audit history, or external routing.

Current limitation: organisation matching is an exact string comparison. It correctly exposes the supplied exercise mismatch but does not cover punctuation, transliteration, aliases, or extraction confidence.

## Next validation test

Run one consented test case through a real registration-document OCR source instead of static JSON, then have a reviewer compare the extracted organisation and document-presence report with the source document.
