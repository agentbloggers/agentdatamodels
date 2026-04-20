---
title: Generate TOOL_DECLARATIONS from Zod via zod-google-genai-schema
status: deferred
opened: 2026-04-20
---

## why

Today `TOOL_DECLARATIONS` in `src/live/voice-chat/app.js` is hand-
written JSON Schema. `eval.mjs` defends the shape with regexes.
Both are fine but brittle: any new tool has to be declared in three
places (declarations, `runTool` switch, executor fn) and kept in
sync with the executor's actual arg names.

`zod-google-genai-schema` converts a Zod object into the exact
`FunctionDeclaration` shape Gemini expects. If we define each tool
as `{ name, description, args: z.object(...), run: (args) => ... }`
we get: one source of truth, runtime arg validation, and the eval
can compare executor arg keys to schema keys directly (no regex).

## scope

- In: refactor `TOOL_DECLARATIONS` into a `tools.js` module that
  exports `{ declarations, runTool }` built from Zod schemas.
- In: swap `eval.mjs`'s regex parsing for a real import of that
  module.
- In: add one eval check that asserts the runtime-validated args
  match the declared schema on a fixture call.
- Out: changing the set of tools themselves (`run_js`, `run_sql`,
  `ask_claude`, `fetch_doc`, `set_avatar_mood` stay).
- Out: pulling Zod into the browser bundle — `tools.js` should
  work whether Zod is available (dev) or not (static-site fallback
  using a tiny hand-rolled validator).

## test recipe

```bash
make eval-voice-chat        # still 17+ passed, with the new check green
GEMINI_API_KEY=… make dev-voice-chat
# speak: "add two and three" → run_js fires → result back
```

## blockers / open questions

- Zod via esm.run is fine in the browser, but it's ~20 KB. Worth
  the cost for a single page? Alternative: use the runtime-only
  `zod/mini` subexport.
- Does `zod-google-genai-schema` carry a compatible license? Need
  to verify before adding.
