import json
from copy import deepcopy
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.rules.c08_report import build_report


router = APIRouter()
SOURCE_DATA = (
    Path(__file__).resolve().parents[3]
    / "octopus-candidate-pack"
    / "C08"
    / "initial.json"
)
_approvals: dict[str, str] = {}
_sendbacks: dict[str, dict[str, str]] = {}
_history: dict[str, list[dict[str, str]]] = {}


def _record_history(programme_id: str, event: str, reviewer_name: str, detail: str = "") -> None:
    """Append-only audit trail. Never rewritten, only added to, so the
    full sequence of reviewer actions stays visible even after a later
    action changes the current status."""
    entry = {
        "event": event,
        "reviewer_name": reviewer_name,
        "detail": detail,
        "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    _history.setdefault(programme_id, []).append(entry)


class ApprovalRequest(BaseModel):
    reviewer_name: str = Field(min_length=1)
    simulated: Literal[True]

    @field_validator("reviewer_name")
    @classmethod
    def reviewer_name_must_be_named(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("reviewer_name must contain a name")
        return value.strip()


class SendBackRequest(BaseModel):
    reviewer_name: str = Field(min_length=1)
    reason: str = Field(min_length=1)
    simulated: Literal[True]

    @field_validator("reviewer_name", "reason")
    @classmethod
    def fields_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("field must contain non-whitespace characters")
        return value.strip()


@lru_cache(maxsize=1)
def load_source_data() -> dict[str, Any]:
    """Load unchanged synthetic C08 data, the sole source of report facts."""
    return json.loads(SOURCE_DATA.read_text(encoding="utf-8"))


def current_report(programme_id: str) -> dict[str, Any]:
    report: dict[str, Any] = deepcopy(build_report(programme_id, load_source_data()))
    reviewer_name = _approvals.get(programme_id)
    if reviewer_name:
        report["status"] = "approved"
        report["approval"] = {
            "reviewer_name": reviewer_name,
            "simulated": True,
            "effect": "status-only; generated claims unchanged",
        }
    elif send_back := _sendbacks.get(programme_id):
        report["status"] = "sent-back"
        report["send_back"] = {
            "reviewer_name": send_back["reviewer_name"],
            "reason": send_back["reason"],
            "simulated": True,
        }
    report["history"] = _history.get(programme_id, [])
    return report


@router.get("/programmes/{programme_id}/report")
async def get_report(programme_id: str) -> dict[str, Any]:
    try:
        return current_report(programme_id)
    except KeyError as error:
        raise HTTPException(status_code=404, detail="Programme not found") from error


@router.post("/programmes/{programme_id}/report/approve")
async def approve_report(
    programme_id: str, approval: ApprovalRequest
) -> dict[str, Any]:
    try:
        build_report(programme_id, load_source_data())
    except KeyError as error:
        raise HTTPException(status_code=404, detail="Programme not found") from error

    _approvals[programme_id] = approval.reviewer_name
    _sendbacks.pop(programme_id, None)
    _record_history(programme_id, "approved", approval.reviewer_name)
    return current_report(programme_id)


@router.post("/programmes/{programme_id}/report/send-back")
async def send_back_report(
    programme_id: str, send_back: SendBackRequest
) -> dict[str, Any]:
    try:
        build_report(programme_id, load_source_data())
    except KeyError as error:
        raise HTTPException(status_code=404, detail="Programme not found") from error

    _sendbacks[programme_id] = {
        "reviewer_name": send_back.reviewer_name,
        "reason": send_back.reason,
    }
    _approvals.pop(programme_id, None)
    _record_history(programme_id, "sent-back", send_back.reviewer_name, send_back.reason)
    return current_report(programme_id)
