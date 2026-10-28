# AI Tutor — Development Progress

## Status
**Overall:** live
**Last Updated:** 2026-10-28 18:35

---

## Current Sprint / Focus
- Entry for the Nebius × NVIDIA Global AI Hackathon (closes 2026-10-31 02:00 KST), Best Apps and Agents track, entrant Statotech Systems. Code and live demo are ready; the video is recorded on 2026-10-30.

---

## Recently Completed
- 2026-10-28: Security update of the web framework, Next.js 16.2.6 to 16.4.2 (with its CSS and image libraries). The library check on the AI Tutor had 1 critical and 2 high findings; now none (1 low remains in KaTeX, whose fix is a major version). 16.4.3 is not used yet: it is under 7 days old.
- 2026-10-28: 11 new original questions, 21 in all (Form 1 to 4, 8 subjects). A live test plays each new one with right working and a common mistake: all 11 finish, none accepts the mistake (docs/eval/items-2026-10-28.json).
- 2026-10-28: Leak test on all 21 questions (measured): plain "don't give the answer" prompt leaked 111 of 126 attempts, AI Tutor 0 of 126 (docs/eval/leaks-2026-10-28.json).
- 2026-10-28: The tutor never shows internal marking-point names (a reply said "That's M1 done" in the 2026-10-23 test): points are described in words in its instructions, and code blocks any reply that names one.
- 2026-10-28: "Where you'll see this" live: after a finished question, a Tavily search of trusted education sites and Nemotron cards that link to the sources. Each question has its own search phrase; PDFs and off-topic results are dropped; all 21 questions got cards (docs/eval/explore-2026-10-28.json).
- 2026-10-28: Talk mode faster, from Blessing's test ("slow, long wait before it spoke"): the tutor reads the question first; a short filler ("Okay, let me look at that.") plays as soon as the learner stops; spoken words are sent at once, with "Say it again" to drop a misheard turn. Measured in the browser on the live site: filler within 0.01 s of the learner's last word, reply voice about 2.5 s after the filler ends (was about 7.5–10 s of silence). Openings and fillers are cached by the CDN; re-warm after each deploy (tests/live/warm-voice.test.ts).
- 2026-10-28: The voice reads numbers, money, units and maths the way a teacher would ("3 dollars 40 cents", "1.4 metres", "12000", binary digit by digit).
- 2026-10-27: Natural voice falls back automatically: Cartesia (two accounts), then Murf Julia, then the phone's own voice.
- 2026-10-27: Each job on the Nemotron model that measured best on 71 labelled cases: Ultra writes replies, Super VL marks and checks, Lightning screens for safety; screen and marker run together. Median turn 3.07 s to 2.25 s, about USD 0.003 a finished question (measured, one run).
- 2026-10-27: Spoken maths written as maths by fixed rules ("three x minus twelve" becomes 3x - 12).
- 2026-10-26: Public repo github.com/StaticB1/ai-tutor (MIT) and demo https://tutor.statotec.com (Vercel fra1, auto-deploys from main). Photo of handwritten working read by Nemotron 3.5 Super VL. Talk mode live.
- 2026-10-23: Engine (safety screen, per-point marker, moves in code, leak guard, signed state), learner UI (dashboard, filters, keypad, read aloud, teacher report, dark mode, large text), simulated-learner test on the first 10 questions: 0 harsh replies, nobody stuck (measured).

---

## Up Next
1. 2026-10-30: record the demo video (3 minutes or less), upload to YouTube as public. If the Cartesia grant has not arrived, record with the current voice chain.
2. Devpost write-up with a feedback section; Blessing clicks Submit before 2026-10-31 02:00 KST.
3. Keep tutor.statotec.com up and funded through judging (2026-12-02 to 12-16 KST).

---

## Blockers
- Replace the Token Factory API key: it was printed into a local Claude session log on 2026-10-28. Nothing was published. Nothing else blocks the submission.
- Voice: Cartesia is on the Free plan ("personal, non-commercial use only" in its terms); the startup grant was re-applied for on 2026-10-28 and is pending. Murf and the phone voice cover any gap.
- Token Factory balance was USD 49.83 on 2026-10-27; not re-checked since today's test runs.
