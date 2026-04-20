# Code-execute-evaluate loop

The runtime contract every tool call in `voice-chat/` flows through.
Small enough to hold in your head, big enough to matter when the model
barges in on itself mid-turn.

## Three phases per tool call

```
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │  CODE    │ ──▶ │ EXECUTE  │ ──▶ │ EVALUATE │ ──▶ back to model
   └──────────┘     └──────────┘     └──────────┘
    model emits      sandbox runs    judge scores
    toolCall         (JS / SQL /     result, emits
                      ask_claude)    toolResponse
```

### 1. CODE — the model proposes

Gemini Live (or Claude, in an `ask_claude` sub-turn) emits a
`toolCall` with a name and JSON args. The client validates:

- Tool name is in the allowlist (`run_js`, `run_sql`, `ask_claude`,
  `fetch_doc`, `set_avatar_mood`).
- Args pass the Zod schema for that tool.
- No `toolCall` is allowed to start a second one until the current
  one has been acknowledged via `toolResponse` — this is the only
  way to keep barge-in sane on a low-latency audio channel.

If validation fails the client returns the failure as a
`toolResponse` with `error: {…}`. The model is expected to read the
error and recover, not retry verbatim.

### 2. EXECUTE — the sandbox runs

Exact executor depends on the tool name:

| Tool | Executor | Budget | Notes |
|---|---|---|---|
| `run_js` | `sandbox.html` iframe + Worker | 2000 ms wall, 64 MB heap | No `fetch`, no `localStorage`; returns `{ value, logs, timings }` |
| `run_sql` | `fetch("/api/pg", …)` | 5000 ms | Read-only role by default; write role gated by allowlist in `.claude/settings.json` |
| `ask_claude` | `/api/ask-claude` → `claude-opus-4-7` | 30 s | `output_config.effort: "high"`, `thinking.type: "adaptive"` |
| `fetch_doc` | `fetch(url)` through same-origin proxy | 10 s | Only hosts listed in `ALLOWED_HOSTS` env |
| `set_avatar_mood` | Anam / HeyGen client side-effect | local | No network beyond the provider SDK |

Every executor returns a structured result with `status: "ok" |
"error"` and a `latency_ms` field. The loop never passes a raw
exception string without a status wrapper — the evaluator needs the
shape to be stable.

### 3. EVALUATE — the judge scores

The evaluator is **not** the audio model. We run a short text-mode
pass against `claude-haiku-4-5` with a system prompt like:

```
You are a silent judge.
Input: {tool_name, args, result, last_user_utterance}.
Output JSON: {ok: bool, reason: string, followup_hint: string|null}.
`followup_hint` is only populated when `ok=false`.
```

The judge's output is attached to the `toolResponse` under a
`_judge` key. Gemini Live gets the raw `result` **and** the judge's
summary. Two uses:

- When `ok=false`, the model sees a plain-language reason rather
  than a stack trace and is more likely to say "that failed because
  X, let me try Y" out loud.
- Judges emit a running transcript that we log to `SCRATCHPAD.md`-
  style session notes for later eval scoring.

Skipping the judge is legal (latency-sensitive loops), but then the
model is responsible for evaluating its own output inside the next
turn. In practice the judge pays for itself on `run_js` and
`run_sql`, not on `fetch_doc`.

## Loop termination

Three ways a loop ends:

1. **Model goes silent** — Gemini emits `serverContent.turnComplete`
   with no further tool call. Normal path.
2. **Tool-budget exhaustion** — max 8 tool rounds per user utterance
   by default. Exceeding the budget emits a synthetic
   `toolResponse` with `error: "tool_round_budget_exceeded"` and the
   client audibly says "let me stop and check in".
3. **User barge-in** — VAD detects speech, we emit
   `session.send({ clientContent: { turnComplete: true } })`
   and abort any in-flight tool with a cancel signal. Any partial
   result is kept for the next turn as context.

## Mapping tool names onto avatars

Gemini Live can emit audio while the loop is still running. We
gate that audio through the avatar on one rule: **only text that
has passed the judge reaches the avatar**. Half-generated tool
arguments never hit Anam or HeyGen — they're text fragments the
model would be embarrassed to say out loud.

The `set_avatar_mood` tool is the one exception: it's a pure UI
side-effect with no result the model needs to evaluate, so it
skips the judge and returns `{status: "ok"}` immediately.

## Where this lives in code

- Tool registry: `voice-chat/app.js` → `TOOLS` constant
- Sandbox: `voice-chat/sandbox.html` + `voice-chat/sandbox-worker.js`
- Judge: `voice-chat/app.js` → `judge()` function (lazy-imports
  `@anthropic-ai/sdk` via the server proxy — no API key in the
  browser)
- Avatar gating: `voice-chat/app.js` → `routeTurnToAvatar()`

If you change any of the above, update this doc in the same commit.
