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
    completion_claim: CompletionClaim = {
        "kind": "completion",
        "value": "not stated",
        "statement": "not stated, no assessment submitted",
        "period": period,
        "source_evidence_id": "ASSESS-A",
        "source_text": evidence["ASSESS-A"]["text"],
    }
    flagged_evidence: list[FlaggedEvidence] = [
        {
            "evidence_id": "VOICE-A",
            "evidence_type": evidence["VOICE-A"]["type"],
            "source_text": evidence["VOICE-A"]["text"],
            "disposition": "excluded-from-numeric-claims",
            "reason": (
                "The speaker self-corrects from a training claim to planned capacity "
                "and says completion still needs checking, so the transcript is ambiguous."
            ),
        }
    ]
    partner_questions: list[PartnerQuestion] = []
    if completion_claim["value"] == "not stated":
        partner_questions.append(
            {
                "id": "Q-COMPLETION",
                "question": f"Please submit the completion assessment for {period}.",
                "source_evidence_id": "ASSESS-A",
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
