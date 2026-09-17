# Three-source cross-check — TDD evidence

## User journey

As a programme reporting officer, I want the plan, attendance sheet, and narrative update compared together so that a discrepancy is visible without treating the narrative as verified numeric evidence.

## Guarantees

| Guarantee | Test | Result |
| --- | --- | --- |
| PLAN-A, SHEET-A, and VOICE-A appear in one comparison | `test_plan_attendance_and_voice_note_are_cross_checked_together` | Pass |
| The voice-note reference to 20 is compared with plan 20 and attendance 12 | same test | Pass |
| A narrative without a comparable number stays visible as unresolved | `test_narrative_without_a_number_is_still_cross_checked_as_unresolved` | Pass |
| Narrative evidence never becomes a numeric claim | `test_voice_note_is_flagged_and_never_cites_a_hard_number` | Pass |

## RED / GREEN evidence

- RED: both new tests failed with `KeyError: 'source_cross_checks'` before production code changed.
- GREEN: `python3 -m pytest app/rules/test_c08_report.py -q` — 15 passed.
- Coverage: `python3 -m pytest app/rules/test_c08_report.py --cov=app.rules.c08_report --cov-report=term-missing -q` — 95% for `c08_report.py`.
- Frontend: `npm run build` — production build completed successfully.

Git checkpoint commits could not be created because `.git` is read-only in this environment. The tests and this report preserve the RED/GREEN evidence.

## Known boundary

Simple number mentions in narrative text are extracted only for comparison. They never become claims. More complex language, including negation and corrections, remains a known validation case and must route to human review.
