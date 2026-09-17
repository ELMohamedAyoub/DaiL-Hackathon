import asyncio
import json
from pathlib import Path

from app.routers.c08 import (
    ApprovalRequest,
    SendBackRequest,
    _approvals,
    _sendbacks,
    approve_report,
    send_back_report,
)
from app.rules.c08_report import build_report


SOURCE_DATA = (
    Path(__file__).resolve().parents[3]
    / "octopus-candidate-pack"
    / "C08"
    / "initial.json"
)


def load_source_data() -> dict:
    return json.loads(SOURCE_DATA.read_text(encoding="utf-8"))


def test_attendance_is_twelve_and_plan_capacity_is_not_attendance():
    report = build_report("PRG-SYN", load_source_data())
    claims = {claim["kind"]: claim for claim in report["numeric_claims"]}

    assert claims["attendance"]["value"] == 12
    assert claims["attendance"]["source_evidence_id"] == "SHEET-A"
    assert claims["planned-capacity"]["value"] == 20
    assert claims["planned-capacity"]["interpretation"] == "target, not actual attendance"


def test_completion_is_explicitly_unstated_when_assessment_is_missing():
    report = build_report("PRG-SYN", load_source_data())

    assert report["completion_claim"]["value"] == "not stated"
    assert report["completion_claim"]["statement"] == "not stated, no assessment submitted"
    assert report["completion_claim"]["source_evidence_id"] == "ASSESS-A"


def test_voice_note_is_flagged_and_never_cites_a_hard_number():
    report = build_report("PRG-SYN", load_source_data())

    assert all(
        claim["source_evidence_id"] != "VOICE-A"
        for claim in report["numeric_claims"]
    )
    assert report["flagged_evidence"][0]["evidence_id"] == "VOICE-A"
    assert report["flagged_evidence"][0]["disposition"] == "excluded-from-numeric-claims"


def test_claim_values_stay_consistent_with_their_source_text():
    """build_report hardcodes 12/20 rather than parsing source_text. If
    initial.json's evidence wording ever changes, this catches the drift
    instead of silently shipping a stale number."""
    data = load_source_data()
    evidence = {item["id"]: item["text"] for item in data["evidence"]}
    report = build_report("PRG-SYN", data)
    claims = {claim["kind"]: claim for claim in report["numeric_claims"]}

    assert str(claims["attendance"]["value"]) in evidence["SHEET-A"]
    assert str(claims["planned-capacity"]["value"]) in evidence["PLAN-A"]


def test_partner_questions_reference_only_source_evidence():
    data = load_source_data()
    source_evidence_ids = {item["id"] for item in data["evidence"]}
    report = build_report("PRG-SYN", data)
    question_evidence_ids = {
        question["source_evidence_id"] for question in report["partner_questions"]
    }

    assert report["partner_questions"]
    assert question_evidence_ids == {"ASSESS-A", "VOICE-A"}
    assert question_evidence_ids <= source_evidence_ids


def test_a_second_narrative_record_under_a_different_id_is_also_excluded():
    """Exclusion must be driven by evidence TYPE, not the literal ID 'VOICE-A'.
    A second narrative record with an unrelated ID proves the rule is general."""
    data = load_source_data()
    data["evidence"].append(
        {
            "id": "FIELD-NOTE-Z",
            "type": "field-note",
            "text": "Coordinator mentioned turnout was strong this cycle.",
        }
    )
    report = build_report("PRG-SYN", data)

    flagged_ids = {item["evidence_id"] for item in report["flagged_evidence"]}
    assert "FIELD-NOTE-Z" in flagged_ids
    assert "VOICE-A" in flagged_ids
    assert all(
        claim["source_evidence_id"] != "FIELD-NOTE-Z"
        for claim in report["numeric_claims"]
    )
    field_note_flag = next(
        item for item in report["flagged_evidence"] if item["evidence_id"] == "FIELD-NOTE-Z"
    )
    assert "field-note" in field_note_flag["reason"]


def test_completion_claim_has_no_citation_when_no_assessment_record_exists():
    """If no evidence record of type 'assessment' exists at all, the report
    must not cite one anyway -- that would be a fabricated citation."""
    data = load_source_data()
    data["evidence"] = [item for item in data["evidence"] if item["type"] != "assessment"]

    report = build_report("PRG-SYN", data)

    assert report["completion_claim"]["value"] == "not stated"
    assert report["completion_claim"]["source_evidence_id"] == ""
    assert report["completion_claim"]["source_text"] == ""
    assert "no record of type assessment present" in report["completion_claim"]["statement"]


def test_report_can_be_sent_back_with_a_reason_then_reapproved():
    programme_id = "PRG-SYN"
    _approvals.pop(programme_id, None)
    _sendbacks.pop(programme_id, None)

    try:
        sent_back = asyncio.run(
            send_back_report(
                programme_id,
                SendBackRequest(
                    reviewer_name="Maya El Idrissi",
                    reason="Please attach the completion assessment.",
                    simulated=True,
                ),
            )
        )

        assert sent_back["status"] == "sent-back"
        assert sent_back["send_back"] == {
            "reviewer_name": "Maya El Idrissi",
            "reason": "Please attach the completion assessment.",
            "simulated": True,
        }
        assert "approval" not in sent_back

        approved = asyncio.run(
            approve_report(
                programme_id,
                ApprovalRequest(reviewer_name="Maya El Idrissi", simulated=True),
            )
        )

        assert approved["status"] == "approved"
        assert approved["approval"]["reviewer_name"] == "Maya El Idrissi"
        assert "send_back" not in approved
    finally:
        _approvals.pop(programme_id, None)
        _sendbacks.pop(programme_id, None)
