# Anthropic Client SDK (`@anthropic-ai/sdk`)

Lower-level HTTP client. Use when you want raw Messages API access
without the Agent SDK's autonomous loop.

## Install

```bash
npm install @anthropic-ai/sdk
```

Requires Node ≥ 18.

## Client init

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();                          // reads ANTHROPIC_API_KEY
const client2 = new Anthropic({ apiKey: "sk-ant-…" });   // explicit
```

## Primary namespaces

| Namespace | Purpose |
|---|---|
| `client.messages` | Messages API (`.create`, `.stream`, `.parse`, `.countTokens`) |
| `client.beta` | Beta features (beta messages, beta files, managed agents, etc.) |
| `client.batches` | Async batch processing (50% of list price) |
| `client.files` | File uploads for multimodal inputs |

## Basic call

```typescript
const response = await client.messages.create({
  model: "claude-opus-4-7",
  max_tokens: 16000,
  messages: [{ role: "user", content: "What's the capital of France?" }],
});

for (const block of response.content) {
  if (block.type === "text") console.log(block.text);
}
```

## Streaming

```typescript
const stream = client.messages.stream({
  model: "claude-opus-4-7",
  max_tokens: 64000,
  messages: [{ role: "user", content: "Write a haiku" }],
});

stream.on("text", (delta) => process.stdout.write(delta));

const finalMessage = await stream.finalMessage();
```

Don't wrap `.on()` events in `new Promise()` — `finalMessage()`
handles completion/error/abort internally.

## Tool runner (beta)

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

const client = new Anthropic();

const getWeather = betaZodTool({
  name: "get_weather",
  description: "Get current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City and state, e.g., San Francisco, CA"),
  }),
  run: async ({ location }) => `72°F and sunny in ${location}`,
});

const finalMessage = await client.beta.messages.toolRunner({
  model: "claude-opus-4-7",
  max_tokens: 16000,
  tools: [getWeather],
  messages: [{ role: "user", content: "What's the weather in Paris?" }],
});
```

## Typed exceptions

Never string-match on `error.message`. Use `instanceof`:

| HTTP | Class |
|---|---|
| 400 | `Anthropic.BadRequestError` |
| 401 | `Anthropic.AuthenticationError` |
| 403 | `Anthropic.PermissionDeniedError` |
| 404 | `Anthropic.NotFoundError` |
| 429 | `Anthropic.RateLimitError` |
| 5xx | `Anthropic.InternalServerError` |
| Any | `Anthropic.APIError` |

All extend `APIError` with a typed `.status`.

## Types to reuse (don't redefine)

`Anthropic.MessageParam`, `Anthropic.Message`, `Anthropic.Tool`,
`Anthropic.ToolUseBlock`, `Anthropic.ToolResultBlockParam`,
`Anthropic.ContentBlock`.

## Model IDs

- Default: `claude-opus-4-7`
- Also: `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5`
- **Never** date-suffix (no `claude-sonnet-4-5-20250514`)

## Opus 4.7 breaking points

- `thinking: {type: "adaptive"}` is the only on-mode. `{type: "enabled",
  budget_tokens: N}` returns 400.
- `temperature`, `top_p`, `top_k` are removed — passing any returns 400.
- Assistant-turn prefills return 400 on Opus 4.7 / Opus 4.6 / Sonnet 4.6.
  Use `output_config.format` or system-prompt instructions instead.
- `thinking` blocks still stream but content is empty unless
  `thinking: {type: "adaptive", display: "summarized"}` (default is
  `"omitted"`).

## Effort

Nested under `output_config`, not top-level:

```typescript
output_config: { effort: "high" }        // low | medium | high | xhigh | max
```

`max` is Opus-tier only. `xhigh` is Opus 4.7 only. Default is `high`.

## Prompt caching

```typescript
cache_control: { type: "ephemeral" }              // auto-caches last cacheable block (simplest)
cache_control: { type: "ephemeral", ttl: "1h" }   // 1h TTL (default 5min)
```

Max 4 cache breakpoints per request. Minimum cacheable prefix is
~1024 tokens on most models (4096 on Opus 4.6/4.7/4.5 + Haiku 4.5).

Verify hits:
```typescript
response.usage.cache_creation_input_tokens
response.usage.cache_read_input_tokens
```

## Compaction (beta, Opus 4.7 / 4.6 / Sonnet 4.6)

```typescript
await client.beta.messages.create({
  betas: ["compact-2026-01-12"],
  model: "claude-opus-4-7",
  context_management: { edits: [{ type: "compact_20260112" }] },
  …
});
```

Critical: append `response.content` (not just the text) to history on
every turn — compaction blocks must be preserved.

## Managed Agents (separate system)

`client.beta.{agents,environments,sessions,vaults}.*`. Beta header:
`managed-agents-2026-04-01` (SDK sets automatically). See the
managed-agents docs linked from `references.md` — it's a full second
product surface (server-managed agents with per-session sandboxed
containers).

## Relationship to this repo

Nothing currently imports `@anthropic-ai/sdk`. If a server-side
feature gets added (e.g. a `/api/bench` endpoint that runs the
dashboard's playbooks against real pages), this is the SDK to add.
