from app.routers.c08 import load_source_data
from app.routers.c08_ask import _citations_are_valid, _valid_evidence_ids


def test_valid_evidence_ids_includes_every_real_record_and_the_programme_id():
    report = {"programme_id": "PRG-SYN"}
    ids = _valid_evidence_ids("PRG-SYN", report)

    source_ids = {item["id"] for item in load_source_data("PRG-SYN")["evidence"]}
    assert source_ids <= ids
    assert "PRG-SYN" in ids


def test_answer_citing_only_real_evidence_ids_is_valid():
    valid_ids = {"SHEET-A", "PLAN-A", "PRG-SYN"}
    answer = "12 people attended (SHEET-A), against a target of 20 (PLAN-A)."

    assert _citations_are_valid(answer, valid_ids)


def test_answer_citing_a_fabricated_evidence_id_is_rejected():
    """The exact failure mode this validation exists to catch: a model that
    cites a record which was never in this programme's evidence set."""
    valid_ids = {"SHEET-A", "PLAN-A", "PRG-SYN"}
    answer = "Completion was 90% according to SURVEY-Z."

    assert not _citations_are_valid(answer, valid_ids)


def test_answer_with_no_citations_at_all_is_valid():
    """A refusal ('not stated in this report') cites nothing and must not
    be rejected just for having no evidence_id in it."""
    valid_ids = {"SHEET-A", "PLAN-A", "PRG-SYN"}
    answer = "Completion is not stated in this report."

    assert _citations_are_valid(answer, valid_ids)
