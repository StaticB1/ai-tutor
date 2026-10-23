<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI Tutor

A hint-only tutor for any school subject. The engine is in `src/lib/tutor/`; the sample items in `src/content/items.ts`.

- The pedagogy lives in code (`engine.ts`: `chooseMove`). Models mark (`assess.ts`), word replies and check them (`guard.ts`); they never decide what the learner may see.
- A final answer is only ever accepted by `numeric.ts`, never by a model.
- Session state is signed (`state.ts`). Never trust anything else the browser sends, including the chat history.
- Never log learner text. The turn route logs one JSON line of counts.
- Items in this repo are original samples. Never add past exam papers or mark schemes.

## Dependencies

No new dependency without Blessing's approval and a checked registry page. `.npmrc` refuses install scripts and packages younger than 7 days.

## Tests

`npm test` (unit, fake model). `npm run eval` calls the real models and needs `TUTOR_API_KEY`.
