# opus-47

Everything that changed in `claude-opus-4-7`. **Never** date-suffix
(`claude-opus-4-7`, never `claude-opus-4-7-20260101`).

## Thinking

Opus 4.7 uses **adaptive thinking only**:

```typescript
thinking: { type: "adaptive" }
```

- `{type: "enabled", budget_tokens: N}` → **400**.
- `temperature`, `top_p`, `top_k` → **400** (all removed).
- `thinking` blocks still stream, but content is empty unless
  `thinking: {type: "adaptive", display: "summarized"}` (default is
  `"omitted"`).

## Effort

Nested under `output_config`, **not** top-level:

```typescript
output_config: { effort: "xhigh" }
```

Levels: `low | medium | high | xhigh | max`. `xhigh` is **Opus 4.7
only**. `max` is Opus-tier only. Default `high`.

## Prefill removed

Assistant-turn prefills 400 on Opus 4.7 / Opus 4.6 / Sonnet 4.6. Use:

- `output_config: { format: { type: "json_schema", schema: {...} } }`, or
- System-prompt instruction + JSON mode,
- Not an empty assistant turn to "start" a response.

## Agent SDK floor

Requires `@anthropic-ai/claude-agent-sdk` ≥ **v0.2.111** /
`claude-agent-sdk` ≥ v0.2.111. Older SDKs fail with
`thinking.type.enabled` on every call.

## Prompt caching

Minimum cacheable prefix on Opus 4.7 / 4.6 / Sonnet 4.6: **4096
tokens** (other models: 1024). Max 4 cache breakpoints per request.

Verify hits:
```typescript
response.usage.cache_creation_input_tokens
response.usage.cache_read_input_tokens
```

## Compaction (beta)

```typescript
await client.beta.messages.create({
  betas: ["compact-2026-01-12"],
  model: "claude-opus-4-7",
  context_management: { edits: [{ type: "compact_20260112" }] },
  messages: [...],
  max_tokens: 64000,
});
```

Critical: **append `response.content` (all blocks, not just text)** to
history on every turn. Compaction preserves structured blocks — a
text-only history corrupts future compactions.

## Task budgets (beta)

`task-budgets-2026-03-13` — declare a token budget per user turn.

## Directives

- Always default new Agent SDK + API code to `claude-opus-4-7`.
- If the user asks for a cheaper/faster option, default to
  `claude-sonnet-4-6` for capability, `claude-haiku-4-5` for cost.
- When migrating code from 4.6 → 4.7, first scrub for `temperature`,
  `top_p`, `top_k`, `budget_tokens`, and prefill turns.

## Source

`/en/model-config`, Anthropic Messages API docs,
`bundled-skills/2.1.114/claude-api/`
