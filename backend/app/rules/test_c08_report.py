import json
from pathlib import Path

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
    assert report["completion_claim"]["statement"] == "not stated — no assessment submitted"
    assert report["completion_claim"]["source_evidence_id"] == "ASSESS-A"


def test_voice_note_is_flagged_and_never_cites_a_hard_number():
    report = build_report("PRG-SYN", load_source_data())

    assert all(
        claim["source_evidence_id"] != "VOICE-A"
        for claim in report["numeric_claims"]
    )
    assert report["flagged_evidence"][0]["evidence_id"] == "VOICE-A"
    assert report["flagged_evidence"][0]["disposition"] == "excluded-from-numeric-claims"
