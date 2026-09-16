# Design Guide — Avoid the "AI Slop" Look, Fast

Goal: a UI that looks like a deliberate choice, not a generated default — without
spending build time on it. This is a filter to apply while building normally,
not a separate design phase.

## Before writing any UI code, pick (30 seconds, out loud is fine):
- **Color**: 4-6 named hex values (a base, a text color, an accent, a
  background, 1-2 supporting tones). Pick something that fits the client's
  actual subject matter — not a generic SaaS blue.
- **Type**: one or two typefaces max. If two, make them clearly different
  roles (e.g. a distinct display face for headings, a clean sans for body).
- **Layout**: one sentence — is this left-aligned, centered, a dashboard grid,
  a single-column narrative? Pick one and stay consistent.

## Hard avoid-list (the tells that scream "default AI output")
Do not default to these unless the brief specifically calls for them:
- Cream/warm-white background (~#F4F1EA) + terracotta accent (~#D97757)
- Near-black background + one neon/acid-green or vermilion accent
- Identical rounded cards everywhere with the same soft grey drop-shadow
- Tracked-out ALL CAPS labels above every section ("OUR SOLUTION")
- Meta text joined with middle dots ("Fast · Reliable · Secure")
- A "→" tacked onto every button/link ("Get Started →")
- Numbered 01 / 02 / 03 markers unless the content is an actual sequence
- Bolding/italicizing a single word in a headline for emphasis

## Fast wins that read as intentional
- Spend your "bold" budget on ONE element (a hero moment, a distinctive
  color, one animation) — keep everything else quiet and disciplined.
- Buttons say the actual action in plain language: "Send message," not
  "Submit." Keep the same word through the whole flow (button → confirmation).
- Empty/error states explain what happened and what to do next — never vague,
  never apologetic filler text.
- Motion: at most one deliberate moment (e.g. a result revealing itself).
  Skip fade-in-on-scroll for every section — it's the generic default.
- Responsive down to mobile and keyboard-focus visible — judges may check
  on a laptop screen only, but don't let it visibly break if resized.

## In the demo itself
A UI that looks considered — even simple — reads as more finished than a
feature-complete app in default component-library styling. Prioritize this
over adding one more feature in the last hour.
