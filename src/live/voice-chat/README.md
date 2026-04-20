# `voice-chat/` — browser voice chat with a code-execute-evaluate loop

A runnable reference for a realtime voice surface that:

1. Streams microphone audio to **Gemini 3.1 Flash Live** over a
   stateful WebSocket.
2. Converts every Gemini `toolCall` into a sandboxed code execution
   in the browser, returning the result as a `toolResponse`.
3. Re-enters the model so it **evaluates** what just happened
   (success, error, next step) and speaks or acts accordingly.
4. Optionally forwards Gemini's text or audio turn to an **Anam** or
   **HeyGen** avatar to render a talking face.

Source of truth for the loop contract is
`code-execute-evaluate-loop.md`. Vendor-specific plumbing lives in
`gemini-live.md`, `anam.md`, `heygen.md`, and `visionagents.md`.

## Run locally

```bash
cd src/live/voice-chat
GEMINI_API_KEY=… node server.mjs        # serves index.html + /api/ephemeral-token
open http://localhost:5173
```

The demo refuses to start if `GEMINI_API_KEY` is unset — keys never
ship in the static bundle.

Optional avatar providers are off by default. Set:

```bash
ANAM_API_KEY=…        # for /api/anam-token
HEYGEN_API_KEY=…      # for /api/heygen-token
```

and pick a provider from the page's `AVATAR` dropdown.

## Architecture in one picture

```
 ┌───────────┐   16k PCM    ┌─────────────────┐   toolCall    ┌───────────────┐
 │ microphone├────────────▶ │ Gemini Live WS  ├─────────────▶ │ sandboxed eval│
 └───────────┘              │ gemini-3.1-flash│ ◀──────────── │ (iframe+worker)│
                            │   -live-preview │  toolResponse └───────────────┘
                            └────────┬────────┘
                         24k PCM audio│   text transcript
                                      ▼
                            ┌─────────────────┐
                            │ avatar (Anam /  │
                            │ HeyGen) — opt.  │
                            └─────────────────┘
```

The shaded "sandboxed eval" is where the **code-execute-evaluate
loop** lives — see the adjacent doc for the full contract and the
judge prompt that scores each execution.

## Why Gemini Live fronts this (for now)

Claude does not yet expose a bidirectional audio WebSocket equivalent
to Gemini Live. The Agent SDK gives us a text-first agentic loop, and
`@anthropic-ai/sdk` gives us streaming text. Neither delivers the
mic-in / speaker-out primitive this page needs. Until the Claude API
ships a live audio transport, the pragmatic split is:

| Responsibility | Runtime |
|---|---|
| Mic capture, VAD, barge-in, audio synth | Gemini Live |
| Orchestrating turns / tool routing | Gemini Live |
| Heavy code reasoning / deep evaluations | Anthropic Messages API — invoked as a Gemini tool named `ask_claude` |
| Avatar face rendering | Anam or HeyGen |

The `ask_claude` tool is intentionally narrow: it takes a natural-
language question plus a serialized context object, returns a string.
The rest of the turn stays inside Gemini's low-latency audio path.

## What counts as "code" in this loop

Three executors, chosen by tool name:

- `run_js({ source })` — runs in a same-origin sandboxed iframe with
  a strict CSP and a Worker-based time budget (default 2s).
- `run_sql({ query })` — forwarded to the Postgres container that
  `make start-web` brings up. Read-only role; write-gated by a
  per-origin allowlist in `.claude/settings.json`.
- `ask_claude({ question, context })` — fan-out to
  `claude-opus-4-7` with `output_config.effort: "high"` for anything
  that needs multi-step thinking.

A tool call that isn't in the allowlist fails loud, and the failure
is fed back to Gemini as a `toolResponse` so the model can *evaluate*
its next move instead of plunging ahead.

## What this demo is **not**

- Not a production voice agent — no auth, no rate limiting beyond
  what the vendors enforce, no persistence.
- Not a replacement for `src/web/agent-sdk.md` — if the task has no
  voice surface, use the Agent SDK directly.
- Not tied to `agentdatamodels.com` — `index.html` at the repo root
  is the benchmark dashboard; this page is a separate artifact
  served from its own directory.
