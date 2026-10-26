# AI Tutor — Development Progress

## Status
**Overall:** live
**Last Updated:** 2026-10-26 12:00

---

## Current Sprint / Focus
- Entry for the Nebius × NVIDIA Global AI Hackathon (closes 2026-10-31 02:00 KST), Best Apps and Agents track, entrant Statotech Systems.

---

## Recently Completed
- 2026-10-26: Public: repo github.com/StaticB1/ai-tutor (MIT) and demo https://tutor.statotec.com (Vercel fra1, auto-deploys from main). A full question completes on production on laptop and phone; daily turn cap 2000 per instance.
- 2026-10-23: Answer opens only after every hint and worked step (Blessing's rule), with a "Show me the answer" button checked server-side and "done with help". Kinder wording; requests for the answer no longer get a canned refusal. Simulated-learner test (4 learner types × 10 questions): 0 harsh replies, nobody stuck, 0 real leaks (measured 2026-10-23).
- 2026-10-23: Learner UI overhaul: dashboard (continue, stats, streak), search and filters, question status, maths keypad, quick replies, read aloud, points pop-up, resume after refresh, finish screen with next question, printable teacher report, My progress and How it works pages, dark mode and large text. Checked at 1366 px and 390 px in light and dark; no page errors, no sideways scroll.
- 2026-10-23: Engine (safety screen, per-point marker, moves in code, leak guard, signed state), 10 original sample items across 8 subjects, web UI with teacher view, 25 unit tests. Live conversations pass on Nebius Token Factory (Nemotron 3 Ultra + 3.5 Super VL), about 1 s a turn (measured from Korea).

---

## Up Next
1. Leak test against a plain chatbot prompt (needs about $1–2 of Token Factory credit).
2. Photo of handwritten working through Nemotron 3.5 Super VL.
3. Demo video (3 minutes or less), Devpost write-up and feedback section; Blessing joins the hackathon on Devpost.

---

## Blockers
- Token Factory credit: $25 promo code never arrived; trial credit nearly used, so further use bills the card on file. The demo must stay up through judging (2026-12-01 to 12-15).
