# Context window

200K tokens by default. What you put into the first 20% of that budget
is paid on **every turn** of the session — local, cloud, or RC.

## Auto-loaded at session start (hidden costs)

| Block | Approx cost | What it is |
|---|---|---|
| System prompt | ~4,200 tokens | Core instructions for behavior, tool use, response formatting. Never visible to you. |
| Auto memory (`MEMORY.md` / `.claude/MEMORY.md`) | up to ~680 tokens | First 200 lines OR 25KB (whichever hits first) of Claude's self-notes from prior sessions. |
| Environment info | ~280 tokens | cwd, platform, shell, OS, `is git repo`. Git branch/status/recent-commits load as a separate trailing block. |
| `CLAUDE.md` | varies | Project instructions. Loaded every session. **Keep short.** |
| MCP tool names | ~120 tokens | Tool names only; schemas stay deferred. |

## MCP tool loading knob

Default: tool names listed, schemas deferred until a task needs them
(tool search loads schemas on demand).

| Value | Behavior |
|---|---|
| `ENABLE_TOOL_SEARCH=auto` | Load schemas upfront if they fit within 10% of the window |
| `ENABLE_TOOL_SEARCH=false` | Load everything upfront (old behavior) |

Leave it at default unless you have a reason.

## Auto-compaction

Runs near capacity. Tune with:

| Var | Effect |
|---|---|
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70` | Compact at 70% instead of default ~95% |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | Override effective window size for compaction math |

Manual: `/compact` (accepts focus hints like `/compact keep the test
output`).

Inspect: `/context`.

## What adds to the window during a session

- File reads (tool results, full content)
- Command outputs (Bash tool results)
- Rule files from `.claude/rules/` (always-on)
- Hook outputs (PreToolUse, PostToolUse, etc.)
- Subagent results (returned via the `Agent` tool — condensed but not
  free)
- In cloud sessions: `server_tool_use` results, `container_upload`
  blocks

## Directives for workflow authors

- **`CLAUDE.md` is paid every turn.** Aim for < ~150 lines. Move
  detail to `src/web/` and reference it.
- **Prefer skills over rules for large content.** Skills load on
  demand; rules are always-on and add to every session's budget.
- **In a Routine prompt, scope to the task.** The cloud session
  already paid for `CLAUDE.md` and `.claude/rules/` — don't repeat
  that context in the prompt body.
- **For long-running agents**, set
  `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70` so you don't hit the compaction
  cliff at 95%.
- **Cache-friendly prompt assembly**: volatile content (timestamps,
  request IDs, per-turn questions) goes **after** the stable prefix,
  not inside it. Interpolating `Date.now()` into the system prompt
  invalidates the entire downstream cache.
- **Don't switch models mid-session** (the cache is model-scoped). Use
  a subagent if a step needs a cheaper model.
- **Check cache hit rate** via `response.usage.cache_read_input_tokens`
  when optimizing. If it's zero across repeated identical prefixes,
  something is silently invalidating.

## Background budgeting heuristic

If this repo's `CLAUDE.md` + `.claude/rules/` + `.claude/skills/`
headers + MCP tool schemas exceed ~10K tokens, it's time to move
something out of always-on scope. Agents can always pull content on
demand via `Read` or skill invocation — nothing is lost by moving it.
