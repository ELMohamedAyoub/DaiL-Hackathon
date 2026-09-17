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

from fastapi import APIRouter, HTTPException
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from app.routers.c08 import current_report

router = APIRouter()

# DeepSeek's OpenAI-compatible chat endpoint. Isolated to this one advisory
# Q&A router; the claim-construction path (c08_report.py) has no model
# dependency at all.
_ask_model = ChatOpenAI(
    model="deepseek-chat",
    base_url="https://api.deepseek.com/v1",
    api_key=os.environ["DEEPSEEK_API_KEY"],
    temperature=0,
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
        response = await _ask_model.ainvoke(prompt)
    except Exception as exc:  # noqa: BLE001 - surface as a clean 502, not a stack trace
        raise HTTPException(status_code=502, detail=f"Model call failed: {exc}")

    answer = response.content if isinstance(response.content, str) else str(response.content)
    return AskResponse(answer=answer.strip())
