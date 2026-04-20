# Veo 3.1 + Nano Banana + Imagen 4 — reference card

Image and video generation surfaces that pair with `voice-chat/`. When
the model calls `run_veo` / `run_imagen` (see the backlog item at
`src/Task/backlog/voice-chat/veo-imagen-tools.md`), these are the
primitives it's reaching for.

The Flow web UI (`labs.google/fx/tools/flow`) is a thin creative shell
on top of exactly these models — **Flow itself has no API**, but every
model Flow uses is directly callable from `@google/genai`.

## Exact names

| Thing | Value |
|---|---|
| npm SDK | `@google/genai` (same SDK as `gemini-live.md`) |
| Python SDK | `google-genai` |
| Veo — fast | `veo-3.1-fast-generate-001` |
| Veo — quality | `veo-3.1-generate-001` |
| Veo — lite | `veo-3.1-lite-generate-preview` |
| Nano Banana (classic) | `gemini-2.5-flash-image` |
| Nano Banana Pro | `gemini-3-pro-image-preview` |
| Imagen 4 — fast | `imagen-4.0-fast-generate-001` |
| Imagen 4 — standard | `imagen-4.0-generate-001` |
| Imagen 4 — ultra | `imagen-4.0-ultra-generate-001` |
| Gemini API docs — video | `https://ai.google.dev/gemini-api/docs/video` |
| Gemini API docs — image | `https://ai.google.dev/gemini-api/docs/image-generation` |
| Vertex AI Veo 3.1 docs | `https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate` |
| Flow UI (no API) | `https://labs.google/fx/tools/flow` |

Never use a date-suffixed preview ID in code. When `-preview` IDs are
promoted to GA, update this card in the same PR that updates
`server.mjs`.

## Pricing (Gemini API, paid tier)

| Call | Cost |
|---|---|
| Veo 3.1 Fast | $0.15 / second of video (audio included) |
| Veo 3.1 Quality | $0.40 / second of video |
| Veo 3.1 Lite | ~$0.075 / second |
| Nano Banana (`gemini-2.5-flash-image`) | $30 / 1M output tokens — ~$0.039 / image |
| Nano Banana — Batch API | 50% off — ~$0.0195 / image |
| Imagen 4 Fast | $0.02 / image |
| Imagen 4 Standard | $0.04 / image |
| Imagen 4 Ultra | $0.06 / image |

Veo has **no free tier** on the Gemini API. If the caller has a Google
AI Ultra subscription, credits only apply inside Flow + Whisk — not to
API-key calls.

**Rate limits:** Veo production models 50 RPM; preview IDs capped at
10 RPM / 10 concurrent.

## Veo 3.1 — what it actually supports

Same feature surface Flow exposes:

- **Text → video**
- **Image → video** — animate a still frame with synced audio
- **Frames → video** — start + end frame interpolation
- **Ingredients → video** — up to 3 reference images for
  characters / objects / scenes, synthesized into one clip
- **Extend** — chain 7-second extensions off a prior Veo-generated
  clip (not arbitrary user video) up to ~148s total
- **Native audio** — dialogue, SFX, ambience. Put quoted text in the
  prompt for dialogue lines.

**Output shape:** 720p or 1080p, 24 fps, 16:9 or 9:16. Single
generation max **8 seconds** (4 / 6 / 8 s options). 4K is a
Flow-side upscale, not an API output.

## Minimal Veo call (server-side)

```javascript
import { GoogleGenAI } from "@google/genai";

// Long-lived key lives only on the server — see server.mjs.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

let op = await ai.models.generateVideos({
  model: "veo-3.1-fast-generate-001",
  prompt: "a cat typing on a mechanical keyboard, cinematic",
  config: {
    aspectRatio: "16:9",
    durationSeconds: 8,
    // Optional — write directly to GCS instead of streaming base64:
    // outputGcsUri: "gs://my-bucket/out/",
  },
});

// Poll — Veo returns a long-running operation.
while (!op.done) {
  await new Promise((r) => setTimeout(r, 15_000));
  op = await ai.operations.getVideosOperation(op);
}

const video = op.response.generatedVideos[0].video; // { uri } or { videoBytes }
```

## Minimal Nano Banana Pro call

Same `generateContent` shape as text generation — the model returns
image bytes as an `inlineData` part.

```javascript
const resp = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents:
    "A product shot of a matte-black espresso machine, studio " +
    "lighting, 4K, crisp text label reading 'CLAUDE' on the side",
});

const part = resp.candidates[0].content.parts.find((p) => p.inlineData);
const pngBytes = Buffer.from(part.inlineData.data, "base64");
```

Nano Banana Pro unique strengths vs. classic: **2K / 4K output**, up
to **14 reference images**, character consistency across up to 5
people, high-fidelity text rendering, **search grounding** for
real-world facts. Use classic `gemini-2.5-flash-image` when you want
low-latency conversational edits and don't need 4K.

## Minimal Imagen 4 call

Imagen uses a `/predict`-shaped endpoint — not `generateContent`.

```javascript
const resp = await ai.models.generateImages({
  model: "imagen-4.0-generate-001",
  prompt: "a neon-lit ramen stall in the rain",
  config: { numberOfImages: 1, aspectRatio: "16:9" },
});

const pngBytes = Buffer.from(
  resp.generatedImages[0].image.imageBytes,
  "base64",
);
```

## Auth — server-side only

Unlike Gemini Live (which mints ephemeral tokens for the browser),
image / video generation stays server-side:

- Long-lived `GEMINI_API_KEY` lives in `server.mjs`.
- Browser hits `/api/gen-media` with a prompt.
- Server calls `@google/genai`, writes the output to a CDN / signed
  URL, returns the URL to the page.
- Browser renders in a sibling panel (per the backlog item's scope).

Ephemeral tokens are **not needed** here — the call is not realtime
and the key never leaves the server.

For enterprise / Vertex AI (ADC-based auth):

```javascript
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: "us-central1",
});
// Same API surface. Use when you need VPC-SC, audit logs, or the
// enterprise quota floor.
```

## Long-running operation lifecycle

- Veo calls return an operation name, not bytes. Poll
  `ai.operations.getVideosOperation(op)` every ~15 s until
  `op.done`.
- Typical Veo 3.1 Fast latency: 10–30 s for an 8 s clip. Quality can
  run 60–120 s. Surface "rendering, hold on" narration to the user so
  they don't repeat the request (see the backlog item's open
  questions).
- On server restart mid-generation: the operation name is the only
  handle. Persist it to Redis / Postgres if you need resume-across-
  restart, otherwise the client re-fires.

## Cost guardrails

A loose mic during a voice-chat demo can rack up calls fast. The
`server.mjs` layer should:

- Reject `/api/gen-media` when `GEMINI_API_KEY` is unset → `501`
  (same graceful-refuse shape as `/api/gemini-token`, covered by
  `eval.mjs`).
- Cap calls per IP per day (default: 20 Veo, 100 Imagen).
- Default to `veo-3.1-fast-generate-001` + `imagen-4.0-fast-generate-001`.
  Require an explicit `quality: "high"` flag to promote to the
  expensive IDs.

## Open-source alternatives

If someone wants to self-host, the closest open replacements (no
match for Nano Banana Pro's text rendering):

- **Wan 2.2** (Alibaba, MoE, multilingual) — mid-range GPU
- **HunyuanVideo** (Tencent, 13B) — A100/H100
- **Mochi 1** (Genmo, 10B) — best T2V fidelity among open
- **LTX-Video** (Lightricks) — fastest, real-time on capable GPUs
- **CogVideoX** — best I2V among open

All available via HuggingFace Diffusers. Not in scope for the voice-
chat demo — listed here so the first question ("can we self-host?")
has an answer.

## Relationship to Flow

- **Flow** is a web UI at `labs.google/fx/tools/flow`; Pro / Ultra
  credits (25 000/mo on Ultra) apply only inside Flow + Whisk.
- **This card** covers the same models via API; API billing is
  per-second / per-image and is separate from Flow credits.
- A `claude-code` Routine that needs to generate a video should use
  the API path (this card) — Flow has no programmatic entry point.
