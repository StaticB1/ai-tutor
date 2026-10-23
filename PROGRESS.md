# AI Tutor — Development Progress

## Status
**Overall:** in-progress
**Last Updated:** 2026-10-23 18:00

---

## Current Sprint / Focus
- Entry for the Nebius × NVIDIA Global AI Hackathon (closes 2026-10-31 02:00 KST), Best Apps and Agents track, entrant Statotech Systems.

---

## Recently Completed
- 2026-10-23: Answer opens only after every hint and worked step (Blessing's rule), with a "Show me the answer" button checked server-side and "done with help". Kinder wording; requests for the answer no longer get a canned refusal. Simulated-learner test (4 learner types × 10 questions): 0 harsh replies, nobody stuck, 0 real leaks (measured 2026-10-23).
- 2026-10-23: Learner UI overhaul: dashboard (continue, stats, streak), search and filters, question status, maths keypad, quick replies, read aloud, points pop-up, resume after refresh, finish screen with next question, printable teacher report, My progress and How it works pages, dark mode and large text. Checked at 1366 px and 390 px in light and dark; no page errors, no sideways scroll.
- 2026-10-23: Engine (safety screen, per-point marker, moves in code, leak guard, signed state), 10 original sample items across 8 subjects, web UI with teacher view, 25 unit tests. Live conversations pass on Nebius Token Factory (Nemotron 3 Ultra + 3.5 Super VL), about 1 s a turn (measured from Korea).

---

## Up Next
1. Leak evaluation against a plain prompt, once the $25 Nebius credit lands (eval-results/leaks.json).
2. Public repo StaticB1/ai-tutor and deploy to tutor.statotec.com (Blessing's go-ahead).
3. Demo video (≤3 min), Devpost text and the feedback section.
4. Photos of handwritten working through Nemotron Super VL, if time allows.

---

## Blockers
- $25 Token Factory promo code not yet received by mail (requested 2026-10-23); $1 trial credit only until then.
