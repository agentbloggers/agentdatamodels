# `src/live/` — realtime voice / video / avatar surfaces

Reference material and runnable demos for **driving Claude Code (and other
agents) through realtime voice + avatar surfaces** instead of a terminal.
The non-terminal entry points listed in the root `CLAUDE.md` cover
message-style channels (Dispatch, Routines, `/fire`, prompt-prefilled
web sessions, `claude -p`). This folder covers the **speak-and-see**
channel: live microphone in, live TTS out, optionally a rendered human
avatar mediating both.

The first concrete demo is `voice-chat/` — a browser page that opens a
live WebSocket to Gemini 3.1 Flash Live, runs a **code-execute-evaluate
loop** for every tool call the model emits, and optionally relays the
model's audio / text to an Anam or HeyGen avatar.

Claude does not currently ship a Live-API-equivalent bidirectional audio
WebSocket. Until it does, the pattern documented here is:

- **Voice + tool orchestration** — Gemini Live (audio in / audio out)
- **Heavy reasoning / code-heavy subturns** — Anthropic Messages API
  (`claude-opus-4-7`) invoked as a Gemini tool call
- **Avatar rendering** — Anam or HeyGen, driven by the audio or text
  stream that Gemini emits

This split lets the same realtime surface fall back to a
Claude-only workflow the moment Claude exposes a comparable live
transport.

## Files

| File | Load when… |
|---|---|
| `voice-chat/README.md` | You're wiring a browser voice-chat surface and need the end-to-end picture |
| `voice-chat/code-execute-evaluate-loop.md` | You're deciding how tool calls turn into runnable code and back into audio |
| `voice-chat/gemini-live.md` | You need exact Gemini Live model IDs, SDK calls, audio formats |
| `voice-chat/anam.md` | You're adding an Anam avatar to a voice session |
| `voice-chat/heygen.md` | You're adding a HeyGen Interactive / Streaming Avatar |
| `voice-chat/visionagents.md` | You're looking at the Python `vision-agents` stack (STT + LLM + TTS + Avatar on a getstream.io edge) |
| `voice-chat/index.html`, `voice-chat/app.js`, `voice-chat/server.mjs` | The runnable demo itself |

## How this folder relates to the rest of the repo

- `src/web/` documents **text-first** cloud / CLI / Routine surfaces.
- `src/live/` documents **audio-first** realtime surfaces.
- Claims that depend on specific vendor SDK shapes live in the
  per-vendor card; cross-link, don't duplicate.
- Any claim here that is not anchored to a fetched doc must be marked
  `<!-- unverified -->` until `sources.md` picks it up.

## House rules for this folder

- No secrets in any file. Ephemeral-session tokens must come from a
  server route (`server.mjs` or a Routine), never from client JS.
- Never embed a long-lived API key in `index.html`. The demo refuses
  to start until it can fetch a token from `/api/gemini-token` or
  similar.
- Keep vendor cards ≤ 200 lines. If a vendor has more surface than
  that, link to the upstream doc and summarize the subset we use.
