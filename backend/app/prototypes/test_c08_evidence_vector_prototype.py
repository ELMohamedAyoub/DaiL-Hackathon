from app.prototypes.c08_evidence_vector_prototype import retrieve_relevant_evidence


def test_retrieval_surfaces_the_attendance_record_for_an_attendance_question():
    hits = retrieve_relevant_evidence("PRG-SYN", "How many people attended?", k=2)

    ids = {hit["id"] for hit in hits}
    assert "SHEET-A" in ids


def test_k_is_capped_at_the_available_evidence_count():
    """PRG-SYN has 4 evidence records; asking for more than exist should not
    error, just return everything there is."""
    hits = retrieve_relevant_evidence("PRG-SYN", "anything", k=999)

    assert len(hits) == 4


def test_each_hit_carries_id_type_and_text_for_downstream_citation_checks():
    hits = retrieve_relevant_evidence("PRG-SYN", "completion status", k=1)

    assert hits
    hit = hits[0]
    assert set(hit.keys()) == {"id", "type", "text"}
