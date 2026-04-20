# Anam — reference card

Real-time conversational AI avatars rendered over WebRTC. In
`voice-chat/` Anam is an optional output layer: the model's text /
audio turn drives a talking human face, and the avatar's own audio
is muxed in place of Gemini's raw TTS.

## Exact names

| Thing | Value |
|---|---|
| Product landing | `https://anam.ai/` |
| Docs landing | `https://anam.ai/docs/` |
| Primary JS SDK (browser) | `@anam-ai/js-sdk` |
| Persona concept | `personaId` — created in the Anam dashboard, references an avatar + voice + brain preset |
| Session token endpoint | `POST https://api.anam.ai/v1/auth/session-token` (server-side only) |
| Transport | WebRTC (audio + video) |

The upstream product docs were 503-ing at the time this card was
written; values above are the ones we've seen in working integrations.
Mark any deviation during a real setup and update here in the same PR.
<!-- unverified: vendor docs 503 at 2026-04-20 fetch -->

## Minimal browser integration

```typescript
import { createClient } from "@anam-ai/js-sdk";

// Never call Anam's session-token endpoint from the browser.
// server.mjs proxies /api/anam-token → api.anam.ai with the
// long-lived ANAM_API_KEY.
const res = await fetch("/api/anam-token", { method: "POST" });
const { sessionToken } = await res.json();

const anam = createClient(sessionToken, {
  personaId: "YOUR_PERSONA_ID",
});

// Attach the avatar's video+audio to DOM elements
await anam.streamToVideoAndAudioElements(
  "anam-video",   // <video id="anam-video"/>
  "anam-audio",   // <audio id="anam-audio"/>
);
```

## Two integration modes

### Mode A — Anam drives the conversation

Anam's own "brain" (an LLM preset) handles turns. Use when the
avatar **is** the agent. Set `personaConfig.brainType` on the
session. Not what `voice-chat/` does, but worth knowing exists.

### Mode B — external brain, Anam as face (our mode)

You keep Gemini Live as the orchestrator. You push text turns at
Anam and it renders the speech + lip-sync:

```typescript
await anam.talk(text);   // or stream via .startTalkStream()
```

Gate this on the `_judge.ok === true` check from the loop doc.
Never push half-generated model output into `talk` — the avatar
will say it.

## Auth

- Server issues an ephemeral `sessionToken` scoped to one browser
  session.
- Token has a short TTL (minutes). Refresh on reconnect rather than
  keeping a long-lived one.
- `ANAM_API_KEY` must never appear in the browser bundle or in a
  `.env` file committed to git.

## Events worth handling

```typescript
anam.on("connection-established", () => setAvatarState("live"));
anam.on("disconnected",           () => setAvatarState("dead"));
anam.on("speech-started",         () => pauseCaptions());
anam.on("speech-ended",           () => resumeCaptions());
```

## When to pick Anam over HeyGen

- **Anam** — lower-latency lip-sync on short turns, simpler browser
  SDK, fewer dashboard moving parts. Reasonable default for a
  coding-copilot face.
- **HeyGen** — richer avatar library, built-in knowledge base
  features, larger ecosystem. Pick when the surface is
  customer-facing and the avatar itself is a product artifact.

## Python / visionagents path

If you want to drive Anam from a Python pipeline (STT + LLM + TTS +
Anam all orchestrated server-side), see `visionagents.md`. The JS
SDK path above is what `voice-chat/app.js` uses.
