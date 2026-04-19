# system-prompts

How to shape Claude Code's system prompt from the outside.

## CLI flags

| Flag | Effect |
|---|---|
| `--append-system-prompt "<text>"` | Append after the default prompt |
| `--append-system-prompt-file <path>` | Append file contents |
| `--system-prompt "<text>"` | **Replace** the default entirely (rarely correct) |

## Agent SDK

`options.systemPrompt` / `options.appendSystemPrompt` on `query()`.

When defining a subagent, the subagent's `prompt` field **is** its
system prompt. The subagent doesn't see the parent's system prompt
unless you echo it in.

## Where the default system prompt lives

Not user-visible. Roughly 4.2K tokens. Contains Claude Code's tool-use
rules, tone rules, Bash policy, commit rules, etc. `--bare` does NOT
remove it — it removes auto-discovery of `CLAUDE.md` / hooks /
skills / plugins, but the CLI still has its baseline prompt.

## Delivery

`CLAUDE.md` content is injected as a **user message after the system
prompt**, not into the system prompt itself. That's why:

- Claude treats CLAUDE.md as context, not enforced configuration.
- For rules that must be system-prompt-level, use
  `--append-system-prompt` in a scripted invocation.

## Directives

- Keep `--append-system-prompt` content short. It's paid on every
  turn and loses attention beyond a few hundred tokens.
- Prefer `CLAUDE.md` + skills for most cases — they're visible to
  `/memory` and can be edited without re-launching.
- For subagents, the `prompt` field (markdown body) is where to put
  instructions — **not** a CLAUDE.md import.

## Source

`/en/agent-sdk/modifying-system-prompts`, `/en/memory`,
`/en/cli-reference#system-prompt-flags`
