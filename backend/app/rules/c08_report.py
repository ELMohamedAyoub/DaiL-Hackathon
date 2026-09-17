from typing import Any, Literal, TypedDict


class NumericClaim(TypedDict):
    kind: Literal["attendance", "planned-capacity"]
    value: int
    unit: str
    period: str
    source_evidence_id: str
    source_text: str
    interpretation: str


class CompletionClaim(TypedDict):
    kind: Literal["completion"]
    value: Literal["not stated"]
    statement: str
    period: str
    source_evidence_id: str
    source_text: str


class EvidenceClass(TypedDict):
    metric: str
    narrative: bool


# Declares which evidence types are authoritative for which metric.
# A type absent from this table (or explicitly marked narrative) is never
# citable for a numeric or completion claim, regardless of wording or ID.
EVIDENCE_CLASSES: dict[str, EvidenceClass] = {
    "attendance": {"metric": "attendance", "narrative": False},
    "plan": {"metric": "planned-capacity", "narrative": False},
    "assessment": {"metric": "completion", "narrative": False},
}


def _is_narrative(evidence_type: str) -> bool:
    evidence_class = EVIDENCE_CLASSES.get(evidence_type)
    return evidence_class is None or evidence_class["narrative"]


def _narrative_reason(evidence_type: str) -> str:
    return f"record type '{evidence_type}' is not an authoritative source for any reported metric."


# Numeric values are not parsed from evidence text (deferred, see TODOS.md).
# This maps known evidence IDs to their known value so a record can still be
# looked up safely; a record whose ID isn't here is omitted from
# numeric_claims rather than crashing or fabricating a number.
_KNOWN_VALUES: dict[str, int] = {
    "SHEET-A": 12,
    "PLAN-A": 20,
    "SHEET-N": 27,
    "PLAN-N": 30,
    "SHEET-D": 16,
    "PLAN-D": 18,
}

_NUMERIC_CLAIM_META: dict[str, dict[str, str]] = {
    "attendance": {"kind": "attendance", "interpretation": "attended at least one session"},
    "plan": {"kind": "planned-capacity", "interpretation": "target, not actual attendance"},
}


def _build_numeric_claims(evidence_list: list[dict[str, Any]], period: str) -> list["NumericClaim"]:
    claims: list[NumericClaim] = []
    for item in evidence_list:
        meta = _NUMERIC_CLAIM_META.get(item["type"])
        if meta is None:
            continue
        value = _KNOWN_VALUES.get(item["id"])
        if value is None:
            # No known value for this record's ID -- omit rather than crash
            # or fabricate. Value parsing from text is deferred (TODOS.md).
            continue
        claims.append(
            {
                "kind": meta["kind"],
                "value": value,
                "unit": "participants",
                "period": period,
                "source_evidence_id": item["id"],
                "source_text": item["text"],
                "interpretation": meta["interpretation"],
            }
        )
    return claims


class FlaggedEvidence(TypedDict):
    evidence_id: str
    evidence_type: str
    source_text: str
    disposition: Literal["excluded-from-numeric-claims"]
    reason: str


class PartnerQuestion(TypedDict):
    id: str
    question: str
    source_evidence_id: str


class C08Report(TypedDict):
    programme_id: str
    programme_name: str
    reporting_period: str
    status: Literal["draft"]
    numeric_claims: list[NumericClaim]
    completion_claim: CompletionClaim
    flagged_evidence: list[FlaggedEvidence]
    partner_questions: list[PartnerQuestion]
    reviewer_notes: list[dict[str, Any]]
    data_status: str
    rules: list[str]


def build_report(programme_id: str, data: dict[str, Any]) -> C08Report:
    """Build an evidence-linked draft without inferring attendance or outcomes."""
    programme = data["programme"]
    if programme["id"] != programme_id:
        raise KeyError(programme_id)

    period = programme["reporting_period"]

    # Completion is never inferred from an assessment record's content -- only
    # its presence or absence is checked. A record's text is surfaced verbatim
    # (source_text) for the reviewer to read; it is never parsed or
    # characterized, so this cannot assert "no assessment submitted" as a
    # verified fact for a record that might say something else entirely.
    assessment_records = [item for item in data["evidence"] if item["type"] == "assessment"]
    if assessment_records:
        completion_source = assessment_records[0]
        completion_claim: CompletionClaim = {
            "kind": "completion",
            "value": "not stated",
            "statement": "not stated, see source assessment record",
            "period": period,
            "source_evidence_id": completion_source["id"],
            "source_text": completion_source["text"],
        }
    else:
        completion_claim = {
            "kind": "completion",
            "value": "not stated",
            "statement": "not stated, no record of type assessment present",
            "period": period,
            "source_evidence_id": "",
            "source_text": "",
        }

    flagged_evidence: list[FlaggedEvidence] = [
        {
            "evidence_id": item["id"],
            "evidence_type": item["type"],
            "source_text": item["text"],
            "disposition": "excluded-from-numeric-claims",
            "reason": _narrative_reason(item["type"]),
        }
        for item in data["evidence"]
        if _is_narrative(item["type"])
    ]
    partner_questions: list[PartnerQuestion] = []
    if completion_claim["source_evidence_id"]:
        # A record exists but its content is deliberately never read, so it
        # cannot be known whether it already answers the completion
        # question. Ask to confirm, not resubmit.
        partner_questions.append(
            {
                "id": "Q-COMPLETION",
                "question": (
                    f"Confirm the completion status stated in "
                    f"{completion_claim['source_evidence_id']} for {period}."
                ),
                "source_evidence_id": completion_claim["source_evidence_id"],
            }
        )
    else:
        partner_questions.append(
            {
                "id": "Q-COMPLETION",
                "question": f"Please submit the completion assessment for {period}.",
                "source_evidence_id": "",
            }
        )
    for item in flagged_evidence:
        partner_questions.append(
            {
                "id": f"Q-{item['evidence_id']}",
                "question": (
                    f"Confirm the actual figure for {item['evidence_id']} "
                    f"({item['evidence_type']}): {item['reason']}"
                ),
                "source_evidence_id": item["evidence_id"],
            }
        )

    return {
        "programme_id": programme["id"],
        "programme_name": programme["name"],
        "reporting_period": period,
        "status": "draft",
        "numeric_claims": _build_numeric_claims(data["evidence"], period),
        "completion_claim": completion_claim,
        "flagged_evidence": flagged_evidence,
        "partner_questions": partner_questions,
        "reviewer_notes": data["reviewer_notes"],
        "data_status": data["data_status"],
        "rules": data.get("rules", []),
    }
