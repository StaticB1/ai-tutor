# AI Tutor

A tutor for any school subject that gives hints, not answers. Built by [Statotech Systems](https://statotec.com) in Harare on NVIDIA Nemotron open models served by [Nebius Token Factory](https://tokenfactory.nebius.com).

The learner answers in their own words. The tutor checks each step against the question's hidden mark scheme, asks one question at a time, and gives a hint or a single worked step when they are stuck. It will not hand over the answer, however it is asked. When the learner has shown every marking point, the full worked solution appears and a teacher view summarises the session.

## Why

Studies of AI tutors point the same way. Tutors that held the worked solution back and guided learners step by step improved results. Open chat that gives answers did not, and in one large trial it lowered exam scores:

- Bastani et al., *PNAS* 2025: about 1,000 high-school maths students. A ChatGPT-like assistant cut unassisted exam scores by 17%; a guarded tutor that held the solution did not.
- Kestin et al., *Scientific Reports* 2025: a tutor that walked students through a solution step by step, with the solution in its prompt, gave large gains.
- De Simone et al., World Bank 2025: six weeks of guided AI tutoring in Nigerian secondary schools, with a teacher present, raised scores by 0.31 SD.

Prompting a model "don't give the answer" is not enough: models give it away when pushed. AI Tutor moves the rules out of the prompt and into code.

## How a turn works

```
learner message
   │
   ▼
1. Safety screen ─── harm or abuse ──► fixed message: talk to a trusted adult, Childline 116
   │ safe
   ▼
2. Marker (Nemotron 3.5 Super VL): one yes/no per hidden marking point, plus any known mistake
   │            final answers are checked by code (numeric.ts), never by a model
   ▼
3. Code chooses the move: probe a mistake · next hint · one worked step · refuse and hint · close
   │            (engine.ts: chooseMove; the learner cannot talk it out of these rules)
   ▼
4. Tutor (Nemotron 3 Ultra) words the move in under 70 words
   │
   ▼
5. Leak guard: code looks for the answer and give-away words; Nemotron checks for unreached points
   │ leak ──► rewrite once with a stricter prompt ──► still leaking? send the pre-written hint
   ▼
reply + signed session state
```

- **State is signed** (HMAC). Points earned, hints used and whether the solution is unlocked live in a token the server signs, so a learner cannot edit their way to the answer. The chat history the browser sends is used as context only; it never earns marks.
- **The answer opens only after every hint.** Hints come first, then worked steps one at a time. Once all of them are used, a "Show me the answer" button appears; the server checks the signed state before it shows anything. The question then counts as "done with help".
- **Guesses do not count.** "Is it 12 or 17?" earns nothing and gets no confirmation either way.
- **Any subject.** A question carries its mark scheme. Maths answers are checked numerically; other subjects are marked point by point, as a mark scheme lists them.

## NVIDIA and Nebius

| Role | Model on Nebius Token Factory |
| --- | --- |
| Tutor replies | `nvidia/Nemotron-3-Ultra-550b-a55b` |
| Marking, leak check, safety screen, teacher summary | `nvidia/Nemotron-3.5-Super-VL` |

Every call goes to Token Factory's OpenAI-compatible API with reasoning switched off (`chat_template_kwargs.enable_thinking=false`), which keeps a turn to about a second. Zero data retention is switched on for the account. Models are set by environment variables, so the same code runs against build.nvidia.com in development.

## Run it

```sh
cp .env.example .env.local   # add TUTOR_API_KEY (Token Factory) and a TUTOR_STATE_SECRET
npm ci
npm run dev                  # http://localhost:3030
npm test                     # unit tests with a fake model
npm run eval                 # live conversations against the real models
```

Node 24, Next.js 16. The leak evaluation (`tests/live/leaks.test.ts`) runs with `TUTOR_RUN_LEAK_EVAL=1` and writes `eval-results/leaks.json`.

## How it was tested

Unit tests run the engine against a fake model (`npm test`). Live tests run it against the real models on Token Factory.

**Simulated learners** (`tests/live/learners.test.ts`): Nemotron 3.5 Lightning plays four kinds of learner on all ten questions, up to ten turns each. Nemotron 3 Ultra judges every tutor reply for leaks and for warmth (1 = harsh, 5 = warm). Measured on 2026-10-23 on the version in this repo:

| Learner | Finished alone | Done with help | Still stuck | Mean warmth |
| --- | --- | --- | --- | --- |
| Struggles with the subject | 9 | 1 | 0 | 4.4 |
| Capable | 10 | 0 | 0 | 4.9 |
| Keeps demanding the answer | 3 | 7 | 0 | 4.3 |
| Writes informal, misspelt English | 10 | 0 | 0 | 4.8 |

Across 165 replies the judge rated none as harsh. It flagged two replies as leaks; in both the learner had typed the answer first and the tutor confirmed it. The first version of the tutor, run through the same test, left 8 of the 10 answer-demanding learners going round in circles with a canned "keep to the question" reply; the changes since then are in the git history.

## Adding questions

Items are in [`src/content/items.ts`](src/content/items.ts). Each has the question, its marking points, the worked solution, known mistakes with a nudge for each, a hint ladder, and, where there is one, a final answer for the code check. The questions here are original samples written for this demo. They are not taken from ZIMSEC or Cambridge papers, and a school's own item bank belongs in its own system.

## Limits

- English only. Shona and Ndebele are not supported yet.
- The model can still be wrong about a step. The teacher view is there so a person checks.
- The rate limit is per server instance, which slows abuse of a public demo rather than stopping it.

## Licence

MIT. Copyright 2026 Statotech Systems (Private) Limited.
