import json
from pathlib import Path

from app.rules.readiness import check_readiness


SOURCE_DATA = (
    Path(__file__).resolve().parents[3]
    / "octopus-candidate-pack"
    / "C07"
    / "initial.json"
)


def load_source_data() -> dict:
    return json.loads(SOURCE_DATA.read_text(encoding="utf-8"))


def test_app_1_is_a_single_item_near_miss_and_preserves_spelling():
    result = check_readiness("APP-1", load_source_data())

    assert result["state"] == "missing-items"
    assert result["missing_document_types"] == ["responsible-person-signoff"]
    assert result["organisation"] == "Learning Workshop A"
    assert result["reviewer_notes"][0]["locked_correction"] is True
    assert result["mismatches"] == []


def test_app_2_reports_mismatch_and_both_missing_items():
    result = check_readiness("APP-2", load_source_data())

    assert result["state"] == "needs-clarification"
    assert result["missing_document_types"] == [
        "activity-plan",
        "responsible-person-signoff",
    ]
    assert result["mismatches"] == [
        {
            "document_id": "REG-2",
            "application_field": "organisation",
            "application_value": "Community Workshop B",
            "document_field": "organisation",
            "document_value": "Community Workshop C",
        }
    ]
