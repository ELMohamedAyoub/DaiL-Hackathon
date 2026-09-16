# Project Context — Octopus Day Build (Client Brief Challenge)

## Who's building this
Solo build, 6-hour time limit, individual challenge (no team). Judged live by a jury
on a working prototype demo. Speed and a clean vertical slice matter more than
feature completeness.

## Status: WAITING FOR BRIEF
Do NOT start building, scaffolding features, or making architecture decisions yet.
The client brief has not been provided. When I paste the brief, your first job is to:
1. Restate the problem in one sentence to confirm you understood it.
2. Propose the smallest end-to-end architecture that proves the concept works.
3. Ask me any clarifying questions BEFORE writing code.
4. Wait for my go-ahead before generating anything.

## Tech stack (default — use unless the brief clearly needs something else)
- Backend: FastAPI + LangGraph for any agent/LLM logic
- Frontend: Next.js + Tailwind CSS
- LLM provider: Anthropic API (key will be in `.env`, already set up)
- Keep it to this stack. Don't introduce new frameworks or heavy dependencies
  mid-build — time is the constraint, not capability.

## Starting point — already cloned, build ON TOP of this, don't start from scratch
- `/backend` — cloned from a LangGraph + FastAPI boilerplate (StateGraph skeleton,
  routes, schemas already structured). Adapt the existing graph/routes to the
  brief instead of rewriting the project structure.
- `/frontend` — a bare `create-next-app --tailwind` shell. No component library
  pre-installed on purpose — keep it that way unless the brief needs one.
- If either doesn't fit the brief's shape at all, say so and propose the
  minimal deviation — don't silently restructure everything.

## Design — read DESIGN.md before writing any UI code
Follow `DESIGN.md` in this repo for visual choices (color, type, layout) and
its avoid-list of generic AI-generated design tells. Pick the color/type/layout
tokens once, early, then stay consistent — don't relitigate design mid-build.

## How I want you to work during the build
- **Plan mode first** for anything non-trivial. Propose the approach, wait for
  confirmation, then implement.
- **Vertical slices only.** Build one working path end-to-end (input → logic →
  visible output) before adding a second feature. Never leave two half-built
  features in progress at once.
- **Small, verifiable steps.** After each meaningful change, tell me exactly how
  to run/test it. I will confirm it works before we move to the next step.
- **No silent scope creep.** If you think of a nice-to-have, mention it and ask —
  don't just build it.
- Keep error handling minimal but present — a crash mid-demo is worse than a
  rough edge.
- Prioritize a working demo over clean code. This is not a production client
  project; do not over-engineer.

## Reserved for late-stage (last ~90 minutes)
Cleanup, error handling polish, UI tidy-up, and a short README explaining what
was built and why. No new features in this window unless I explicitly ask.

## My background (for context on tone/depth of explanations)
AI engineering background — LangChain/LangGraph, FastAPI, RAG systems, and
agentic automation. You don't need to over-explain fundamentals to me; do flag
non-obvious tradeoffs.
