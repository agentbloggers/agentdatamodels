# HeyGen — reference card

HeyGen Streaming / Interactive Avatar as an optional output layer
for `voice-chat/`. Same role as Anam — render a talking face driven
by text or audio from the Gemini Live session — but a different
SDK and a richer avatar catalog.

## Exact names

| Thing | Value |
|---|---|
| Product (avatars) | `https://www.heygen.com/avatars/ai-video-avatar` |
| API docs | `https://docs.heygen.com/` |
| Primary JS SDK | `@heygen/streaming-avatar` |
| Session token endpoint | `POST https://api.heygen.com/v1/streaming.create_token` (server-side only) |
| Session create endpoint | `POST https://api.heygen.com/v1/streaming.new` |
| Transport | LiveKit / WebRTC |

<!-- unverified: HeyGen docs page 503 during the 2026-04-20 fetch;
     exact TaskType / quality enum names should be re-verified when
     docs are reachable. -->

## Minimal browser integration

```typescript
import StreamingAvatar, { AvatarQuality, TaskType } from "@heygen/streaming-avatar";

// /api/heygen-token is implemented in server.mjs and hits
// streaming.create_token with HEYGEN_API_KEY.
const { token } = await fetch("/api/heygen-token").then((r) => r.json());

const avatar = new StreamingAvatar({ token });

avatar.on("stream_ready", (evt) => {
  const el = document.getElementById("heygen-video");
  el.srcObject = evt.detail;
  el.play();
});

avatar.on("stream_disconnected", () => setAvatarState("dead"));

await avatar.createStartAvatar({
  quality: AvatarQuality.Low,     // Low | Medium | High
  avatarName: "YOUR_AVATAR_ID",
  voice: { voiceId: "YOUR_VOICE_ID" },
});
```

## Pushing text to the avatar

```typescript
await avatar.speak({
  text,
  task_type: TaskType.REPEAT,   // REPEAT = say this verbatim
});
```

`TaskType.TALK` lets HeyGen's own brain respond to the text; we
don't use that mode in `voice-chat/` because Gemini Live is already
the brain.

Gate calls to `speak` on the judge pass (see
`code-execute-evaluate-loop.md`) — same rule as Anam.

## Session lifecycle

```typescript
await avatar.stopAvatar();    // end session
```

Always `stopAvatar` on `beforeunload` — HeyGen bills per streamed
minute, and orphaned sessions stay alive for several minutes before
the server reaps them.

## Auth

- Long-lived `HEYGEN_API_KEY` stays server-side.
- `/streaming.create_token` issues a short-lived session token; the
  browser uses that token only.
- Never log the token; it still confers session control if stolen
  in-flight.

## Quality / cost knobs

| Knob | Effect |
|---|---|
| `AvatarQuality.Low` | Lowest bitrate; safest default for coding copilots |
| `AvatarQuality.Medium` | Noticeably crisper lips; costs more |
| `AvatarQuality.High` | Demo / stage mode; keep off by default |
| `voice.rate`         | Playback speed (0.5 – 1.5) |
| `voice.emotion`      | `neutral` / `serious` / `friendly` / `excited` — vendor's enum |

## When to pick HeyGen over Anam

Pick HeyGen when:

- The avatar itself is part of the product brand (customer-facing
  demo, marketing surface).
- You need HeyGen-specific avatars from their library.
- You want a knowledge-base-driven "TALK" mode as a fallback.

Pick Anam when the latency budget is tight and the face is purely
presentational — see `anam.md` for the counter-case.
