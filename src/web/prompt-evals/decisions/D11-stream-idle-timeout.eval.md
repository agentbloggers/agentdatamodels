---
name: D11 — stream-idle-timeout resilience
decision: |
  Every streaming Claude invocation (SessionStart agent hook,
  Routine, /fire webhook, `claude -p --bare`) is resumable after
  an "API Error: Stream idle timeout - partial response received".
  The session's state survives in three places, keyed by
  CLAUDE_CODE_REMOTE_SESSION_ID: (1) $CLAUDE_ENV_FILE written
  durably by bootstrap-services.sh, (2) otel_tool_results table
  in Postgres, (3) Redis cache of fetched doc URLs.
wa_provenance:
  - https://wellarchitected.github.com/library/application-security/design-principles/  # "Design for Proactivity"
  - https://wellarchitected.github.com/library/scenarios/nist-ssdf-implementation/  # RV.1 audit-log streaming + retention
  - https://wellarchitected.github.com/library/application-security/recommendations/managing-dependency-threats/  # "Monitor and respond continuously"
scope: both
timeout: 30
---

# Check

Three predicates, all must be true — each validates one of the
three durable-state substrates:

1. **Bootstrap writes to `$CLAUDE_ENV_FILE`** — script contract:
   ```bash
   grep -q 'CLAUDE_ENV_FILE' scripts/bootstrap-services.sh
   grep -q 'CLAUDE_CODE_REMOTE_SESSION_ID' scripts/bootstrap-services.sh
   ```
   Both return 0. This ensures a resumed session can re-read its
   env without re-running the hook chain.

2. **`otel_tool_results` table schema is present** — schema contract:
   ```bash
   grep -q 'otel_tool_results' sql/bootstrap.sql
   grep -q 'session_id.*NOT NULL' sql/bootstrap.sql
   grep -q "'timeout'" sql/bootstrap.sql
   ```
   All three return 0. The `status` CHECK constraint includes
   `'timeout'` so stream idle timeouts land in a queryable state
   rather than dropping on the floor.

3. **Redis cache design documents the resilience path** —
   design contract:
   ```bash
   grep -q 'D11' src/web/dependencies/redis-cache.md
   grep -q 'stream-idle-timeout' src/web/dependencies/redis-cache.md
   ```
   Both return 0. The cache's D11 row in the cross-ref table
   is the user-facing "we thought about this" marker.

Return `{"ok": true}` when all three predicates pass. On failure,
name which substrate is missing:
- predicate 1 → `bootstrap-services.sh` doesn't persist session env
- predicate 2 → `sql/bootstrap.sql` missing the `otel_tool_results`
  timeout status
- predicate 3 → `redis-cache.md` doesn't acknowledge D11

# Scorer

All three `grep -q` sequences above exit 0.

# Skip condition

None. This eval is pure file-system state, no network, no binaries.
It runs in every session regardless of mode, because the resilience
it validates is itself scope-independent.

# Why this matters

Observed failure, logged this session: an Agent tool call mid-turn
hit "API Error: Stream idle timeout - partial response received".
Without D11's three substrates, that error leaves an orphaned
`tool_use` with no matching `tool_result` in the transcript — the
next model call rejects the transcript, requiring manual surgery.

With D11's substrates:
- The bootstrap env file means a resumed session has
  `$DATABASE_URL` + `$REDIS_URL` + `$OTEL_RESOURCE_ATTRIBUTES`
  already set.
- `otel_tool_results.status = 'timeout'` rows are queryable; an
  operator can `SELECT * FROM otel_tool_results WHERE status =
  'timeout' ORDER BY started_at DESC LIMIT 10;` to see what the
  agent was doing when it died.
- Redis cache hits mean the resumed session doesn't re-fetch and
  re-stream, lowering the odds of hitting the same failure again.
