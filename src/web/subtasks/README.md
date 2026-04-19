# subtasks

Delegating subtasks — via the built-in `Agent` tool or custom
subagents.

## Two ways to delegate

| Path | When |
|---|---|
| Built-in `Agent` tool → `general-purpose` subagent | One-off research or multi-step side task; no specialized prompt needed |
| Custom subagent (`.claude/agents/<name>.md`) | Repeated pattern with specialized prompt + tool restrictions + memory |

## Built-in subagents

| Agent | Model | Tools | Use |
|---|---|---|---|
| `Explore` | Haiku | read-only | file discovery, codebase search |
| `Plan` | inherit | read-only | research during plan mode |
| `general-purpose` | inherit | all | complex multi-step tasks |
| `statusline-setup` | Sonnet | limited | invoked by `/statusline` |
| `Claude Code Guide` | Haiku | Glob, Grep, Read, WebFetch, WebSearch | questions about Claude Code features |

## What subagents inherit

| Receives | Does NOT receive |
|---|---|
| Own system prompt + the Agent-tool prompt | Parent conversation history |
| Project `CLAUDE.md` (if `settingSources` allows) | Skills (unless listed in `skills:` frontmatter) |
| Tool definitions (inherited or `tools:` subset) | Parent system prompt |

The **only** channel parent → subagent is the Agent tool's prompt
string. Include every file path, error message, and decision the
subagent needs directly in that prompt.

## Directives

- **One job per subagent.** If a subagent's description needs "and",
  split it.
- Write the `description` as a "Use when…" sentence — Claude's
  delegation classifier uses this.
- Restrict tools to the minimum the subagent needs.
- Use `memory: project` when the subagent should accumulate
  repo-specific knowledge.
- Don't include `Agent` in a subagent's `tools` — subagents can't
  spawn subagents.
- When running agents in parallel, fire all `Agent` tool calls in a
  single model response — otherwise they serialize.

## Source

`/en/sub-agents`, `/en/agent-sdk/subagents`
