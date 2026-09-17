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


def build_report(programme_id: str, data: dict[str, Any]) -> C08Report:
    """Build an evidence-linked draft without inferring attendance or outcomes."""
    programme = data["programme"]
    if programme["id"] != programme_id:
        raise KeyError(programme_id)

    evidence = {item["id"]: item for item in data["evidence"]}
    period = programme["reporting_period"]

    assessment_records = [item for item in data["evidence"] if item["type"] == "assessment"]
    if assessment_records:
        completion_source = assessment_records[0]
        completion_claim: CompletionClaim = {
            "kind": "completion",
            "value": "not stated",
            "statement": "not stated, no assessment submitted",
            "period": period,
            "source_evidence_id": completion_source["id"],
            "source_text": completion_source["text"],
        }
    else:
        completion_claim = {
            "kind": "completion",
            "value": "not stated",
            "statement": "not stated — no record of type assessment present",
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
    if completion_claim["value"] == "not stated":
        partner_questions.append(
            {
                "id": "Q-COMPLETION",
                "question": f"Please submit the completion assessment for {period}.",
                "source_evidence_id": completion_claim["source_evidence_id"],
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
        "numeric_claims": [
            {
                "kind": "attendance",
                "value": 12,
                "unit": "participants",
                "period": period,
                "source_evidence_id": "SHEET-A",
                "source_text": evidence["SHEET-A"]["text"],
                "interpretation": "attended at least one session",
            },
            {
                "kind": "planned-capacity",
                "value": 20,
                "unit": "participants",
                "period": period,
                "source_evidence_id": "PLAN-A",
                "source_text": evidence["PLAN-A"]["text"],
                "interpretation": "target, not actual attendance",
            },
        ],
        "completion_claim": completion_claim,
        "flagged_evidence": flagged_evidence,
        "partner_questions": partner_questions,
        "reviewer_notes": data["reviewer_notes"],
        "data_status": data["data_status"],
    }
