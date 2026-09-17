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
C08_DIR = Path(__file__).resolve().parents[3] / "octopus-candidate-pack" / "C08"

# Programme id -> source file. PRG-SYN is the official exercise record.
# Everything else is demo-only simulated data, kept in its own folder per
# the exercise's disclosure rule, never merged into the official file.
_PROGRAMME_SOURCES: dict[str, Path] = {
    "PRG-SYN": C08_DIR / "initial.json",
    "PRG-NOASSESS": C08_DIR / "demo-cases" / "PRG-NOASSESS.json",
    "PRG-DOUBLE": C08_DIR / "demo-cases" / "PRG-DOUBLE.json",
    "PRG-BULK": C08_DIR / "demo-cases" / "PRG-BULK.json",
}

PROGRAMME_SUMMARIES = [
    {
        "id": "PRG-SYN",
        "label": "Official case: plan vs attendance vs voice note vs missing assessment",
        "official": True,
    },
    {
        "id": "PRG-NOASSESS",
        "label": "Demo case: no assessment record submitted at all",
        "official": False,
    },
    {
        "id": "PRG-DOUBLE",
        "label": "Demo case: two separate ambiguous narrative records",
        "official": False,
    },
    {
        "id": "PRG-BULK",
        "label": "Demo case: a full 12-week programme, 17 records, 8 evidence types",
        "official": False,
    },
]

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


@lru_cache(maxsize=None)
def load_source_data(programme_id: str) -> dict[str, Any]:
    """Load unchanged synthetic C08 data for one programme, the sole source
    of that programme's report facts."""
    path = _PROGRAMME_SOURCES.get(programme_id)
    if path is None:
        raise KeyError(programme_id)
    return json.loads(path.read_text(encoding="utf-8"))


def current_report(programme_id: str) -> dict[str, Any]:
    report: dict[str, Any] = deepcopy(
        build_report(programme_id, load_source_data(programme_id))
    )
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


@router.get("/programmes")
async def list_programmes() -> list[dict[str, Any]]:
    return PROGRAMME_SUMMARIES


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
        build_report(programme_id, load_source_data(programme_id))
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
        build_report(programme_id, load_source_data(programme_id))
    except KeyError as error:
        raise HTTPException(status_code=404, detail="Programme not found") from error

    _sendbacks[programme_id] = {
        "reviewer_name": send_back.reviewer_name,
        "reason": send_back.reason,
    }
    _approvals.pop(programme_id, None)
    _record_history(programme_id, "sent-back", send_back.reviewer_name, send_back.reason)
    return current_report(programme_id)
