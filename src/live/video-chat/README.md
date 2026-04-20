# src/live/video-chat

Reference implementation of a **browser-native video chat** between a user
and an LLM-driven avatar. Two provider layers are plug-compatible:

| Layer       | Provider                         | Role                                   |
| ----------- | -------------------------------- | -------------------------------------- |
| Reasoning   | Gemini Live API (WebSocket bidi) | Speech-in, text + audio-out, tool use  |
| Avatar      | Anam.ai (default) / HeyGen       | Photoreal persona video with lip-sync  |
| Transport   | WebRTC (avatar) + WS (Gemini)    | Low-latency media                      |
| Token proxy | `server.js` (Node, optional)     | Issues short-lived session tokens      |

The **code-execute-evaluate loop** this directory is built around:

1. Write a small change in `client.js` or `avatar.js`.
2. `python3 -m http.server 8080` from the repo root.
3. Open `http://localhost:8080/src/live/video-chat/`, click **Start**.
4. Watch the transcript panel + browser devtools console.
5. Iterate.

## Files

- `index.html` — self-contained page, no build step (CDN + ES modules).
- `client.js` — Gemini Live WebSocket client: mic → PCM16 @16k → bidi,
  plays 24 kHz audio out, emits `text-delta` events.
- `avatar.js` — provider-agnostic avatar adapter. Default backend is
  Anam; swap `PROVIDER` to `"heygen"` to use HeyGen's streaming avatar.
- `server.js` — Node HTTP proxy that exchanges long-lived API keys for
  ephemeral session tokens. Keep your `GOOGLE_API_KEY`, `ANAM_API_KEY`,
  and `HEYGEN_API_KEY` here — never in the browser.
- `config.js` — endpoint and model defaults in one place.

## Running locally

```bash
# 1) one-time: install server deps
cd src/live/video-chat && npm install

# 2) export keys (ephemeral tokens never touch the browser)
export GOOGLE_API_KEY=...
export ANAM_API_KEY=...        # optional — omit to run Gemini-only
export HEYGEN_API_KEY=...      # optional — alternate avatar backend

# 3) run proxy + static server on the same port
node server.js                 # serves /token/* AND ./ on :8787
open http://localhost:8787/
```

With no keys set, the page runs in **mock mode**: the transcript panel
echoes mic transcription using the Web Speech API and the avatar is
replaced by a static poster image. Useful for iterating on UI without
burning quota.

## Architecture

```
  ┌──────────┐      PCM16 @16k       ┌────────────────┐
  │  browser │ ─────────────────────▶│ Gemini Live    │
  │  (mic)   │                       │  WebSocket     │
  └──────────┘ ◀──── 24k PCM audio ──│  bidi stream   │
       │                             └────────────────┘
       │ text deltas                        │
       ▼                                    │
  ┌──────────┐                              │
  │ avatar   │◀── talk(text) ───────────────┘
  │ <video>  │
  └──────────┘
       ▲
       │ WebRTC track
       │
  ┌──────────────┐
  │ Anam/HeyGen  │
  │ stream       │
  └──────────────┘
```

The avatar consumes **text deltas** (not the Gemini audio track) so we
can keep lip-sync owned by the avatar provider. If you want raw Gemini
audio to be the voice, pipe it into an `<audio>` element and disable the
avatar's TTS (`personaConfig.voice: "none"` for Anam).

## Provider notes

### Gemini Live

- WebSocket URL (v1beta):
  `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent`
- Auth: `?key=<API_KEY>` **or** `?access_token=<EPHEMERAL>` from the
  `v1alpha/auth/ephemeralTokens` endpoint. Prefer ephemeral.
- Model for realtime dialog: `models/gemini-2.5-flash-preview-native-audio-dialog`
  (see `config.js` to override).
- Setup frame, realtime input, and server content shapes live in
  `client.js`. Verify against `ai.google.dev/gemini-api/docs/live`
  before shipping — Google has iterated the schema.

### Anam

- SDK: `@anam-ai/js-sdk` (loaded via esm.sh in the browser).
- Flow: `server.js` calls `POST https://api.anam.ai/v1/auth/session-token`
  with the long-lived API key + `personaConfig`; the returned
  `sessionToken` is handed to the browser.
- Browser: `createClient(sessionToken).streamToVideoAndAudioElements(...)`
  then `.talk(text)` to speak.

### HeyGen (alternate)

- SDK: `@heygen/streaming-avatar`.
- Flow: `POST https://api.heygen.com/v1/streaming.create_token` → browser
  `new StreamingAvatar({ token })` → `.createStartAvatar({ avatarName })`
  → `.speak({ text })`.

## References

- Google: <https://github.com/google-gemini/gemini-live-api-examples>
- Google docs: <https://ai.google.dev/gemini-api/docs/live>
- Anam: <https://anam.ai/> · <https://docs.anam.ai/>
- HeyGen: <https://www.heygen.com/avatars/ai-video-avatar>
- VisionAgents (Anam integration recipe): <https://visionagents.ai/integrations/avatars/anam>

## What this is **not**

- Not an SDK; it's a wired-together demo meant to be cloned and trimmed.
- Not production-hardened: no rate limiting, retry/backoff, or audit
  logging on the token proxy. Treat `server.js` as a starting point.
- Not tied to `agentdatamodels.com` — the static bundle can be hosted
  anywhere, or folded into the existing `index.html` via an iframe.
