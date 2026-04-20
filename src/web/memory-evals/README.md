# memory-evals

Evaluating whether the memory system is actually improving outcomes.

## What to measure

| Question | Metric |
|---|---|
| Is auto-memory helping? | Pass rate on repeated tasks, with vs without `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` |
| Is `CLAUDE.md` too long? | `wc -l CLAUDE.md` + eval delta with slimmer version |
| Are subagents using their memory? | `ls .claude/agent-memory/<name>/` growth over time |
| Is memory dragging latency? | `p95 time` with/without memory loaded |

## Memory hygiene checks

- `MEMORY.md` should be the index, not the knowledge base. If it's
  > 200 lines, Claude should have sharded it into topic files.
- Topic files (`debugging.md`, `patterns.md`) should be referenced
  from `MEMORY.md`.
- Stale entries (references to code that doesn't exist anymore) should
  be removed. Run `/memory` → open folder → audit.

## Subagent memory evals

For a subagent with `memory: project`:

1. Save a known insight via a scripted invocation.
2. Delete session. Start new session.
3. Verify the subagent recalls the insight when prompted.
4. Check `.claude/agent-memory/<name>/MEMORY.md` reflects the insight.

## Directives

- Memory is additive — let it grow, but audit quarterly.
- Don't commit `.claude/agent-memory-local/` (local scope is
  gitignored by convention).
- For cloud-session subagents, use `memory: project` — `user` and
  `local` don't travel.
- If an eval regresses after memory enabled, the memory is likely
  overfitting to past sessions. Trim aggressively.

## Source

`/en/memory`, `/en/sub-agents#enable-persistent-memory`
