# Pain, client feedback, and what changed

## C07 — caseworker case

**Pain:** Missing or mismatched evidence emails read like rejection to applicants.

**Initial scope:** A general "application checker."

**Change:** After re-reading exercise RULE-3 ("a human reviewer alone decides the application"), scope was narrowed. The tool never approves or rejects; it only reports state: review-ready, needs-clarification, or missing-items.

A locked reviewer correction (NOTE-1) was also respected: preserve organisation spelling exactly as supplied and do not auto-correct it. This followed an earlier extraction pass that had incorrectly shortened the organisation name.

## C08 — reporting officer case

**Pain:** A plan target (20), an attendance sheet (12), a self-correcting voice note ("we trained twenty... I mean planned for twenty, need to check completion"), and a missing completion assessment tell different stories. Officers were at risk of picking whichever number looked best.

**Initial instinct:** Extract "the" attendance number.

**First change:** After re-reading reviewer note NOTE-A (use "attended" for attendance; never report "completed" without the assessment), the design changed. The voice note was shown but excluded from numeric claims. Completion became an explicit "not stated" state rather than a blank or a guess.

**Client feedback:** The voice note should not feel ignored; all three sources should be cross-checked. The resulting report also felt difficult to understand because it exposed rules and report machinery before the decision.

**Second change:** The prototype now compares the plan, attendance sheet, and narrative together. Narrative remains non-authoritative, but it can corroborate a value, expose a discrepancy, or remain unresolved. The result-first reviewer brief now leads with: “12 attended. 20 was the target. Completion is unknown,” followed by the one discrepancy, a recommended action, and safe draft wording. The detailed comparison, sources, rules, and questions remain below as the audit trail.

**Third change:** A follow-up clarity review found that the extra “Process evidence” step made the demo feel like a system ceremony rather than a decision aid. The flow was reduced to one labeled simulation trigger that loads the sources and immediately presents the reviewer brief.

**Fourth change:** The approval controls were still buried beneath the full audit trail. They now sit immediately below the reviewer brief with task-based labels—“Approve wording” and “Request evidence.” The request form asks what the partner must clarify and explains that the reason becomes part of review history. Detailed rules and sources remain available below for inspection.

**Observable outcome:** In under two minutes, a reporting officer can identify the supported activity statement, see why an outcome cannot yet be claimed, and either approve the draft or send it back with a source-linked question.
