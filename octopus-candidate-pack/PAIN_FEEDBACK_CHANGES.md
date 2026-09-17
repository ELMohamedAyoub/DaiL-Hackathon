# Pain, client feedback, and what changed

## C07 — caseworker case

**Pain:** Missing or mismatched evidence emails read like rejection to applicants.

**Initial scope:** A general "application checker."

**Change:** After re-reading exercise RULE-3 ("a human reviewer alone decides the application"), scope was narrowed. The tool never approves or rejects; it only reports state: review-ready, needs-clarification, or missing-items.

A locked reviewer correction (NOTE-1) was also respected: preserve organisation spelling exactly as supplied and do not auto-correct it. This followed an earlier extraction pass that had incorrectly shortened the organisation name.

## C08 — reporting officer case

**Pain:** A plan target (20), an attendance sheet (12), a self-correcting voice note ("we trained twenty... I mean planned for twenty, need to check completion"), and a missing completion assessment tell different stories. Officers were at risk of picking whichever number looked best.

**Initial instinct:** Extract "the" attendance number.

**Change:** After re-reading reviewer note NOTE-A (use "attended" for attendance; never report "completed" without the assessment), the design changed. The voice note is shown but explicitly excluded from numeric claims, flagged with reason. Completion is rendered as an explicit "not stated" state rather than a blank or a guess.
