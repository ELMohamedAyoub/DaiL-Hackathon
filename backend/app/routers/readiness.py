import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.rules.readiness import check_readiness


router = APIRouter()
SOURCE_DATA = (
    Path(__file__).resolve().parents[3]
    / "octopus-candidate-pack"
    / "C07"
    / "initial.json"
)


class DocumentEvidence(BaseModel):
    id: str
    application: str
    type: str
    status: str
    organisation: str | None = None


class ReviewerNote(BaseModel):
    id: str
    application: str
    text: str
    locked_correction: bool


class MismatchDetail(BaseModel):
    document_id: str
    application_field: str
    application_value: str
    document_field: str
    document_value: str


class ReadinessResponse(BaseModel):
    application_id: str
    organisation: str
    requested_activity: str
    state: Literal["review-ready", "needs-clarification", "missing-items"]
    missing_document_types: list[str]
    mismatches: list[MismatchDetail]
    documents: list[DocumentEvidence]
    reviewer_notes: list[ReviewerNote]
    data_status: str


@lru_cache(maxsize=1)
def load_source_data() -> dict[str, Any]:
    """Load the unchanged C07 exercise file, the sole case-data source."""
    return json.loads(SOURCE_DATA.read_text(encoding="utf-8"))


@router.get("/applications/{application_id}/readiness")
async def get_readiness(application_id: str) -> ReadinessResponse:
    try:
        return ReadinessResponse.model_validate(
            check_readiness(application_id, load_source_data())
        )
    except KeyError as error:
        raise HTTPException(status_code=404, detail="Application not found") from error
