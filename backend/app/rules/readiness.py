from typing import Any, Literal, TypedDict


REQUIRED_DOCUMENT_TYPES = (
    "registration",
    "activity-plan",
    "responsible-person-signoff",
)


class Mismatch(TypedDict):
    document_id: str
    application_field: str
    application_value: str
    document_field: str
    document_value: str


class ReadinessResult(TypedDict):
    application_id: str
    organisation: str
    requested_activity: str
    state: Literal["review-ready", "needs-clarification", "missing-items"]
    missing_document_types: list[str]
    mismatches: list[Mismatch]
    documents: list[dict[str, Any]]
    reviewer_notes: list[dict[str, Any]]
    data_status: str


def check_readiness(application_id: str, data: dict[str, Any]) -> ReadinessResult:
    """Report evidence readiness without making a case outcome decision."""
    application = next(
        (item for item in data["applications"] if item["id"] == application_id),
        None,
    )
    if application is None:
        raise KeyError(application_id)

    documents = [
        document
        for document in data["documents"]
        if document["application"] == application_id
    ]
    present_types = {
        document["type"]
        for document in documents
        if document.get("status") == "present"
    }
    missing_types = [
        document_type
        for document_type in REQUIRED_DOCUMENT_TYPES
        if document_type not in present_types
    ]

    mismatches: list[Mismatch] = []
    for document in documents:
        document_organisation = document.get("organisation")
        if (
            document_organisation is not None
            and document_organisation != application["organisation"]
        ):
            mismatches.append(
                {
                    "document_id": document["id"],
                    "application_field": "organisation",
                    "application_value": application["organisation"],
                    "document_field": "organisation",
                    "document_value": document_organisation,
                }
            )

    if mismatches:
        state = "needs-clarification"
    elif missing_types:
        state = "missing-items"
    else:
        state = "review-ready"

    return {
        "application_id": application_id,
        "organisation": application["organisation"],
        "requested_activity": application["requested_activity"],
        "state": state,
        "missing_document_types": missing_types,
        "mismatches": mismatches,
        "documents": documents,
        "reviewer_notes": [
            note
            for note in data.get("reviewer_notes", [])
            if note["application"] == application_id
        ],
        "data_status": data["data_status"],
    }
