# Octopus Day — C08 Evidence Report Desk

## Problem
A programme reporting officer must reconcile a plan target, attendance register, narrative update, and possibly-missing assessment without turning uncertain evidence into a reportable fact.

## Approach
We built a result-first, evidence-linked report desk. It keeps targets separate from attendance, keeps narrative evidence visible but non-authoritative, refuses to infer completion, and leaves the final approve/send-back decision with a human reviewer.

## Tech stack
- Backend: FastAPI + deterministic Python rules + DeepSeek for disclosed ambiguous extraction and report Q&A
- Frontend: Next.js + Tailwind CSS

## How to run
```bash
# Backend
cd backend && uv sync && ./dev.sh
# → http://localhost:8461

# Frontend
cd frontend && npm run dev
# → http://localhost:4927
```

## What's built vs. what's next

Built end-to-end: deterministic report construction, source-linked claims, three-source cross-checks, explicit unknown completion state, partner follow-up questions, simulated human review with visible history, demo-only variation cases, and print/PDF export.

Simulated or deferred: source ingestion, authentication, durable persistence, real reviewer identity, external publication, and production document extraction. The next validation is an 8–12-pack consented, redacted sample reviewed independently by two programme officers.

See the [C08 build guide](octopus-candidate-pack/C08/BUILD.md), [Wolf handoff](octopus-candidate-pack/C08/WOLF_HANDOFF.md), [data-readiness plan](octopus-candidate-pack/C08/DATA_READINESS.md), and [presentation script](octopus-candidate-pack/PRESENTATION_SCRIPT.md).
