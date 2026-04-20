---
title: Add run_veo + run_imagen tools via google-genai-api
status: deferred
opened: 2026-04-20
---

## why

The Gemini news for the week of 2026-04-20 pushed Veo 3 free access
inside Google Vids and a price cut on Veo 3.1 Fast. A voice-chat
session where the model can say "let me render that as a quick
clip" and have an actual video show up next to the avatar would be
a compelling demo, and Veo 3.1 Fast brings the latency/cost inside
the range where it's tolerable during a live turn.

`@google/genai` (npm) — the same official SDK already used by
`src/live/voice-chat/gemini-live.md` — covers Gemini + Veo 3.1 +
Imagen 4 + Nano Banana in one package, so we don't need three
integrations. Reference card with exact model IDs, pricing, and
minimal snippets lives at `src/live/voice-chat/veo-imagen.md`.

## scope

- In: two new tools, `run_veo({prompt})` and `run_imagen({prompt})`,
  routed through a new `server.mjs` endpoint `/api/gen-media` that
  holds the long-lived key server-side and returns a signed URL
  the page can render.
- In: a tenth row in the eval matrix asserting `/api/gen-media`
  returns 501 when `GEMINI_API_KEY` is unset (same graceful-refuse
  shape as `/api/gemini-token`).
- Out: inline video playback inside the avatar iframe — render in
  a sibling panel instead, no CSP rework.
- Out: Veo 4 (expected at I/O 2026-05-19) — add as a follow-up when
  the model ID is published.

## test recipe

```bash
GEMINI_API_KEY=… make dev-voice-chat
# speak: "render a 4-second clip of a cat typing"
# → run_veo fires → <video> shows up in right panel within ~15s
make eval-voice-chat   # new row: POST /api/gen-media (no key) → 501
```

## blockers / open questions

- Veo 3.1 Fast latency is still multi-second — does the model
  need explicit "I'm working on it, hold on" narration so the user
  doesn't repeat themselves?
- Cost per call vs. demo-budget. Set a hard daily cap in
  `server.mjs` before shipping.
