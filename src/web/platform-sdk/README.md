# platform-sdk

Anthropic platform SDKs — the language bindings for `api.anthropic.com`.

## Packages

| Language | Package | Repo |
|---|---|---|
| TypeScript / JS | `@anthropic-ai/sdk` | `github.com/anthropics/anthropic-sdk-typescript` (v0.90.0) |
| Python | `anthropic` | `github.com/anthropics/anthropic-sdk-python` |
| Go | `github.com/anthropics/anthropic-sdk-go` | same |
| Java | `com.anthropic:anthropic-sdk-java` | `github.com/anthropics/anthropic-sdk-java` |
| Ruby | `anthropic` | `github.com/anthropics/anthropic-sdk-ruby` |

## Relationship to the Agent SDK

| | Client SDK (here) | Agent SDK (`/src/web/agent-sdk.md`) |
|---|---|---|
| Responsibility | Raw Messages API | Full agent loop |
| Tool loop | you implement | handled |
| Built-in tools | no | `Read`, `Edit`, `Bash`, `Agent`, etc. |
| Session resume | no | yes |
| `.claude/` pickup | no | yes (configurable) |

## TypeScript quick reference

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const response = await client.messages.create({
  model: "claude-opus-4-7",
  max_tokens: 16000,
  messages: [{ role: "user", content: "hi" }],
});
```

Key namespaces: `messages`, `beta`, `batches`, `files`.

## Directives

- Never handle errors with string-matching on `error.message` — use
  `instanceof Anthropic.RateLimitError` etc.
- Reuse `Anthropic.MessageParam`, `Anthropic.Tool`, etc. types —
  don't redefine.
- For streaming, use `.stream()` + `finalMessage()`, not event
  callbacks wrapped in `new Promise()`.

## Source

`/src/web/sdk.md` for the full TS reference; per-language repos linked
above.
