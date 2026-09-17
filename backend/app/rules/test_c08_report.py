import asyncio
import json
from pathlib import Path

from app.routers.c08 import (
    ApprovalRequest,
    SendBackRequest,
    _approvals,
    _history,
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


def test_report_surfaces_the_source_rules_verbatim():
    """The rules array from initial.json was computed but never exposed in
    the report. A judge/reviewer should be able to see the exact rule text
    the engine is claiming to follow, not take it on faith."""
    data = load_source_data()
    report = build_report("PRG-SYN", data)

    assert report["rules"] == data["rules"]
    assert report["rules"]


def test_completion_is_explicitly_unstated_when_assessment_is_missing():
    report = build_report("PRG-SYN", load_source_data())

    assert report["completion_claim"]["value"] == "not stated"
    assert report["completion_claim"]["statement"] == "not stated, see source assessment record"
    assert report["completion_claim"]["source_evidence_id"] == "ASSESS-A"


def test_voice_note_is_flagged_and_never_cites_a_hard_number():
    report = build_report("PRG-SYN", load_source_data())

    assert all(
        claim["source_evidence_id"] != "VOICE-A"
        for claim in report["numeric_claims"]
    )
    assert report["flagged_evidence"][0]["evidence_id"] == "VOICE-A"
    assert report["flagged_evidence"][0]["disposition"] == "excluded-from-numeric-claims"


def test_plan_attendance_and_voice_note_are_cross_checked_together():
    """The narrative stays non-authoritative, but it must participate in the
    comparison instead of disappearing into a generic excluded bucket."""
    report = build_report("PRG-SYN", load_source_data())

    comparison = report["source_cross_checks"][0]
    assert comparison["source_evidence_ids"] == ["PLAN-A", "SHEET-A", "VOICE-A"]
    assert comparison["status"] == "needs-review"
    assert "20" in comparison["finding"]
    assert "planned capacity" in comparison["finding"]
    assert "attendance of 12" in comparison["finding"]
    assert "target, not actual attendance" in comparison["action"]


def test_narrative_without_a_number_is_still_cross_checked_as_unresolved():
    data = load_source_data()
    voice_note = next(item for item in data["evidence"] if item["id"] == "VOICE-A")
    voice_note["text"] = "Turnout felt strong, but I need to check the register."

    report = build_report("PRG-SYN", data)

    comparison = report["source_cross_checks"][0]
    assert comparison["status"] == "unresolved"
    assert comparison["source_evidence_ids"] == ["PLAN-A", "SHEET-A", "VOICE-A"]
    assert "no comparable number" in comparison["finding"].lower()


def test_claim_values_stay_consistent_with_their_source_text():
    """Authoritative values must remain grounded in their own source text."""
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


def test_missing_attendance_and_plan_records_do_not_crash():
    """Bug 1: numeric_claims used to do evidence['SHEET-A'] / evidence['PLAN-A']
    directly. A data set missing those exact IDs must not crash -- it should
    just omit the claim, never fabricate a value."""
    data = load_source_data()
    data["evidence"] = [item for item in data["evidence"] if item["type"] not in ("attendance", "plan")]

    report = build_report("PRG-SYN", data)

    claim_kinds = {claim["kind"] for claim in report["numeric_claims"]}
    assert claim_kinds == set()


def test_empty_evidence_list_does_not_crash():
    """Bug 4: zero evidence records at all must produce an empty, well-formed
    report, not a crash."""
    data = load_source_data()
    data["evidence"] = []

    report = build_report("PRG-SYN", data)

    assert report["numeric_claims"] == []
    assert report["flagged_evidence"] == []
    assert report["completion_claim"]["source_evidence_id"] == ""


def test_completion_statement_does_not_assert_non_submission_for_positive_assessment():
    """Bug 2: an assessment record that reports real completion data must not
    be relabeled "no assessment submitted" -- that fabricates the opposite of
    what the record says. The claim must stay content-agnostic; the actual
    text is exposed via source_text for the reviewer to read."""
    data = load_source_data()
    for item in data["evidence"]:
        if item["id"] == "ASSESS-A":
            item["text"] = "9 of 12 participants completed the full programme."

    report = build_report("PRG-SYN", data)

    assert "no assessment submitted" not in report["completion_claim"]["statement"]
    assert report["completion_claim"]["source_text"] == (
        "9 of 12 participants completed the full programme."
    )

    completion_question = next(
        q for q in report["partner_questions"] if q["id"] == "Q-COMPLETION"
    )
    assert "please submit" not in completion_question["question"].lower()
    assert "confirm" in completion_question["question"].lower()


def test_unknown_attendance_record_is_extracted_from_unambiguous_text():
    """Authoritative records no longer require a pre-registered ID when
    their own text contains exactly one unambiguous number."""
    data = load_source_data()
    data["evidence"].append(
        {
            "id": "SHEET-B",
            "type": "attendance",
            "text": "15 unique participants attended at least one session.",
        }
    )

    report = build_report("PRG-SYN", data)

    attendance_claims = [c for c in report["numeric_claims"] if c["kind"] == "attendance"]
    assert [(claim["source_evidence_id"], claim["value"], claim["confidence"]) for claim in attendance_claims] == [
        ("SHEET-A", 12, "high"),
        ("SHEET-B", 15, "high"),
    ]


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

        events = [entry["event"] for entry in approved["history"]]
        assert events == ["sent-back", "approved"]
    finally:
        _approvals.pop(programme_id, None)
        _sendbacks.pop(programme_id, None)
        _history.pop(programme_id, None)
