# context-evals

How to evaluate context-window usage and auto-compaction behavior.

## What to measure

| Metric | Where to find it | Target |
|---|---|---|
| Tokens used vs 200K | `/context` | < 70% before compaction |
| `cache_read_input_tokens` | `response.usage` | > 0 on repeated identical prefixes |
| `cache_creation_input_tokens` | `response.usage` | ≤ one full cache write per cold start |
| `CLAUDE.md` size | `wc -l CLAUDE.md` | < 200 lines |
| `.claude/rules/` total | `wc -l .claude/rules/*.md` | < 500 lines, ideally <200 |
| Auto memory size | `wc -l ~/.claude/projects/<repo>/memory/MEMORY.md` | < 200 lines |

## Benchmark harness

A cheap eval: run the same `-p` prompt with `--output-format json`
with different `CLAUDE.md` sizes, compare:

- Total tokens in `usage.input_tokens`
- `result` quality (manually graded or AI-graded against a rubric)

## Common regressions

- **Cache miss on every turn**: a volatile value (timestamp, request
  ID) was interpolated into a stable prefix. Move it *after* the
  stable content.
- **Context bloat from auto memory**: Claude accumulated notes over
  weeks. Run `/memory` → open folder → trim.
- **Rules file drift**: a path-scoped rule's `paths:` pattern
  stopped matching. Check with `InstructionsLoaded` hook.

## Directives

- Run context evals before shipping a new `CLAUDE.md` change — a
  200-line addition costs ~4K tokens *every turn*.
- Verify cache hit rate above 50% on steady-state workloads. Below
  that, something is silently invalidating.
- Use `/compact keep <topic>` to preserve specific threads across
  compaction.

## Source

`/en/context-window`, `/en/memory`, Anthropic prompt-caching cookbook
