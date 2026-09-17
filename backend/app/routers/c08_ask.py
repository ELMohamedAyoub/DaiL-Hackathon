"""Grounded Q&A over an already-computed C08 report.

This is the one place in C08 an LLM touches the pipeline, and it is
deliberately downstream and advisory only: it answers questions using
the report JSON that `c08_report.build_report` already produced
deterministically. It never re-derives a claim, never invents a number,
and is told explicitly to refuse rather than guess when the report
doesn't contain the answer. See TODOS.md / the C08 design discussion
for why the claim-construction path itself stays LLM-free.
"""

import json
import os
import re
from functools import lru_cache

from fastapi import APIRouter, HTTPException
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from app.routers.c08 import current_report, load_source_data

router = APIRouter()


@lru_cache(maxsize=1)
def _get_ask_model() -> ChatOpenAI:
    """Built lazily, on first real request, not at import time -- so
    importing this module (e.g. to unit-test the citation validation below)
    never requires DEEPSEEK_API_KEY to be set."""
    return ChatOpenAI(
        model="deepseek-chat",
        base_url="https://api.deepseek.com/v1",
        api_key=os.environ["DEEPSEEK_API_KEY"],
        temperature=0,
    )

# Matches evidence-id-shaped tokens (e.g. "SHEET-A", "PLAN-A", "PRG-NOASSESS")
# so a model answer can be checked for citations that don't actually exist
# in this programme's evidence set, without hand-listing every real ID here.
_EVIDENCE_ID_PATTERN = re.compile(r"\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+\b")

_UNVERIFIABLE_ANSWER = (
    "This answer could not be verified against the report's evidence records "
    "and has been withheld. Try rephrasing the question, or check the claim "
    "ledger and excluded-evidence sections directly."
)

_SYSTEM_PROMPT = """You answer questions about a single evidence report for a programme reviewer.

Rules, no exceptions:
- Answer ONLY using facts present in the REPORT JSON below. Never use outside knowledge, never estimate, never infer a number that isn't in the JSON.
- Every factual claim in your answer must cite the evidence_id it came from (e.g. "SHEET-A").
- If the question asks for something the report does not state (a number, a status, a fact), say plainly that it is not stated in this report, and name which evidence record would need to change for that to be answerable. Do not guess.
- Keep answers to 2-4 sentences. No preamble, no "Based on the report".
"""


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str


def _valid_evidence_ids(programme_id: str, report: dict) -> set[str]:
    """The only IDs a citation in an answer is allowed to name: every real
    evidence record for this programme, plus the programme id itself (the
    model may legitimately reference the programme, that's not a claim)."""
    source = load_source_data(programme_id)
    ids = {item["id"] for item in source["evidence"]}
    ids.add(programme_id)
    ids.add(report["programme_id"])
    return ids


def _citations_are_valid(answer: str, valid_ids: set[str]) -> bool:
    cited = set(_EVIDENCE_ID_PATTERN.findall(answer))
    unverifiable = cited - valid_ids
    return not unverifiable


@router.post("/programmes/{programme_id}/ask", response_model=AskResponse)
async def ask_about_report(programme_id: str, body: AskRequest) -> AskResponse:
    question = body.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="question must not be empty")

    try:
        report = current_report(programme_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown programme_id: {programme_id}")

    prompt = f"{_SYSTEM_PROMPT}\n\nREPORT JSON:\n{json.dumps(report, indent=2)}\n\nQUESTION: {question}"

    try:
        response = await _get_ask_model().ainvoke(prompt)
    except Exception as exc:  # noqa: BLE001 - surface as a clean 502, not a stack trace
        raise HTTPException(status_code=502, detail=f"Model call failed: {exc}")

    answer = response.content if isinstance(response.content, str) else str(response.content)
    answer = answer.strip()

    valid_ids = _valid_evidence_ids(programme_id, report)
    if not _citations_are_valid(answer, valid_ids):
        return AskResponse(answer=_UNVERIFIABLE_ANSWER)

    return AskResponse(answer=answer)
