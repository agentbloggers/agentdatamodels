# Internal subagent system

Project-scoped subagents for this repo, per `/en/sub-agents`.

All agents here are defined as markdown files with YAML frontmatter.
They're auto-discovered at session start (restart if you add/edit a
file mid-session, or run `/agents` to reload).

## Roster

| Agent | Model | Memory | Color | Purpose |
|---|---|---|---|---|
| `benchmark-author` | sonnet | project | yellow | Dashboard UI work (`index.html`, `components/`) |
| `docs-librarian` | sonnet | project | blue | Curate `src/web/` + refresh against live docs |
| `routine-builder` | sonnet | project | purple | Design + debug cloud Routines |
| `plugin-integrator` | sonnet | project | green | `.claude/settings.json` + `.claude-plugins/` |
| `seed-prompt-keeper` | sonnet | project | cyan | Maintain `.claude/seed-prompts/` |
| `eval-runner` | sonnet | project | orange | Run `src/web/*-evals/` + triage regressions |
| `gemmah-director` | opus | project | red | EVALUATE-stage quality gate for `src/flow/` videos |

All seven use `memory: project` so their learnings live at
`.claude/agent-memory/<name>/` and travel with the repo (including to
cloud sessions).

## Frontmatter conventions used

Per `/en/sub-agents#supported-frontmatter-fields` (v2.1.114):

```yaml
---
name: <lowercase-hyphens>          # required
description: Use when …            # required; "Use when" is the classifier hint
tools: Read, Glob, Grep, Edit, …   # allowlist
model: sonnet                      # or opus / haiku / inherit / a full ID
memory: project                    # persistent memory scope
color: blue                        # display color
---
```

Fields we deliberately **didn't** set (but are available):

- `disallowedTools` — prefer explicit `tools` allowlist
- `permissionMode` — inherit from session
- `maxTurns` — let Claude self-regulate
- `skills` — subagents call skills explicitly when needed
- `mcpServers` — let subagents share the parent's MCP servers
- `hooks` — no per-subagent hook policy yet
- `effort` — inherit from session
- `isolation` — no worktree needed yet
- `initialPrompt` — these run as subagents, not as main session agents
- `background` — no long-running background tasks yet

## Memory layout on disk

```
.claude/agent-memory/
├── benchmark-author/
│   ├── MEMORY.md           # index; first 200 lines load into the subagent
│   └── …                   # topic files Claude creates
├── docs-librarian/
├── eval-runner/
├── plugin-integrator/
├── routine-builder/
├── seed-prompt-keeper/
└── gemmah-director/
```

When a subagent writes its first memory, the directory is created
on disk. Project-scope memory is checked into git — the memory
*is* the shared knowledge base.

## Adding a new agent

1. Create `.claude/agents/<name>.md` with frontmatter + system prompt
   body.
2. Restart session or run `/agents` to reload.
3. Test: prompt mentions the agent's trigger phrase → Claude
   delegates.
4. Document it in this README table.

## Directives

- **One job per agent.** If `description` needs "and", split it.
- Write `description` as a "Use when…" sentence — Claude's
  delegation classifier uses it.
- Never include `Agent` in a subagent's `tools` — subagents can't
  spawn subagents (built-in `general-purpose` subagent is the
  exception, used for ad-hoc delegation).
- For agents that write to the repo (`Edit`, `Write`), keep their
  scope narrow via the system prompt body. Hard-rule sections help.

## Source

`/en/sub-agents`, `/en/agent-sdk/subagents`, `/en/memory`
