# Gemini Live API — reference card

Voice-in / voice-out model that fronts `voice-chat/`. Stateful
WebSocket, binary audio frames, tool calling.

## Exact names

| Thing | Value |
|---|---|
| Default model | `gemini-3.1-flash-live-preview` |
| npm SDK | `@google/genai` |
| Transport | WSS (stateful) |
| Input audio | raw 16-bit PCM, 16 kHz, little-endian |
| Output audio | raw 16-bit PCM, 24 kHz, little-endian |
| Realtime input MIME | `audio/pcm;rate=16000` |
| Example repo | `github.com/google-gemini/gemini-live-api-examples` |
| Docs landing | `https://ai.google.dev/gemini-api/docs/live` |
| SDK getting-started | `https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk` |

Never use a date-suffixed preview ID. If the preview gets promoted,
update this card in the same PR that updates the code.

## Minimal browser client

```typescript
import { GoogleGenAI, Modality } from "@google/genai";

// In production, fetch an ephemeral token from your server —
// never ship the long-lived API key in the browser.
const ai = new GoogleGenAI({ apiKey: EPHEMERAL_TOKEN });

const session = await ai.live.connect({
  model: "gemini-3.1-flash-live-preview",
  config: {
    responseModalities: [Modality.AUDIO],
    systemInstruction:
      "You are a calm coding partner. When you need to run code, " +
      "call run_js. When you need data from Postgres, call run_sql. " +
      "When a question is hard and multi-step, call ask_claude.",
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: "Aoede" },
      },
    },
  },
  callbacks: {
    onopen:    () => console.log("live open"),
    onmessage: (msg) => handleServerMessage(msg),
    onerror:   (e)   => console.error("live err", e),
    onclose:   (e)   => console.log("live close", e.reason),
  },
});
```

## Sending mic audio

```typescript
// chunk is a Uint8Array of 16-bit PCM @ 16 kHz (see AudioWorklet below)
session.sendRealtimeInput({
  audio: {
    data: btoa(String.fromCharCode(...chunk)),
    mimeType: "audio/pcm;rate=16000",
  },
});
```

A working capture pipeline: `getUserMedia({ audio: true })` →
`AudioContext` → `AudioWorklet` that down-samples to 16 kHz mono
16-bit PCM, posts `Uint8Array` chunks every ~100 ms. The
`voice-chat/app.js` demo does exactly this.

## Receiving server messages

Every `onmessage` can contain any combination of:

- `serverContent.modelTurn.parts[*].inlineData` — base64 24 kHz
  PCM chunks. Queue them onto an `AudioContext` destination.
- `serverContent.modelTurn.parts[*].text` — interim transcript of
  the model turn. Route to the avatar as closed captions.
- `serverContent.turnComplete` — audio turn finished; safe to
  switch to "listening" UI.
- `toolCall.functionCalls[*]` — pairs of `{ id, name, args }`. Feed
  into the code-execute-evaluate loop; reply with
  `session.sendToolResponse({ functionResponses: [...] })` once
  the result is ready.

```typescript
session.sendToolResponse({
  functionResponses: [
    { id: call.id, name: call.name, response: { result: runResult } },
  ],
});
```

## Tool declaration shape

```typescript
const TOOL_DECLARATIONS = [
  {
    name: "run_js",
    description: "Run a short piece of JS in a sandbox. Returns { value, logs }.",
    parameters: {
      type: "object",
      properties: {
        source: { type: "string", description: "JS source — no network, no DOM" },
      },
      required: ["source"],
    },
  },
  {
    name: "ask_claude",
    description: "Ask claude-opus-4-7 a hard, multi-step question.",
    parameters: {
      type: "object",
      properties: {
        question: { type: "string" },
        context:  { type: "string", description: "Any serialized context the answer needs." },
      },
      required: ["question"],
    },
  },
];
```

## Auth — use ephemeral tokens

Gemini supports short-lived tokens minted server-side so the
browser never sees the long-lived API key. Pattern:

- Long-lived `GEMINI_API_KEY` lives only on the server (see
  `server.mjs`).
- Client hits `/api/gemini-token` on page load.
- Server mints a token scoped to the Live API and returns it.
- Client constructs `new GoogleGenAI({ apiKey: token })`.

The `gemini-live-ephemeral-tokens-websocket` example in the upstream
repo documents the token-mint shape we mirror.

## Barge-in / interruption

```typescript
session.send({ clientContent: { turnComplete: true } });
```

Send this when your VAD fires on the user's mic while the model is
still speaking. Drops the model's current audio turn and re-enters
listening. Do not close the WebSocket — `turnComplete` is enough.

## Connection lifecycle

- Keep one session per page load. Live sessions are session-scoped;
  closing + reopening resets context.
- On `onerror`, reconnect with exponential backoff and **replay the
  last user utterance** into the new session's `clientContent`. Do
  not replay tool responses — the new session has never seen the
  tool calls that produced them.

## Relationship to Claude

Gemini handles the realtime transport. Claude handles the deep
reasoning via the `ask_claude` tool. If the Claude API ever ships a
bidirectional audio live transport, this card and the
`voice-chat/app.js` wiring get replaced wholesale — the
code-execute-evaluate loop itself does not change.
