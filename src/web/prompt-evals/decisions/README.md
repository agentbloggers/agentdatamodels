# decisions — per-decision WA-anchored evals

Each `D<N>-<slug>.eval.md` validates one decision from the plan
at `/root/.claude/plans/create-mkdir-src-web-to-memoized-river.md`.
Every decision cites its Well-Architected Q1 2026 provenance in
frontmatter. Drift on the WA page means the eval's framing needs
to be re-checked.

| Eval | Decision | Scope | Skipped when |
|---|---|---|---|
| D1 | `make graphql-web` fails closed on drift | both | — |
| D2 | `docker-compose.yml` layout (base + `observe` profile) | both | `docker` unavailable |
| D3 | PR pins use `.patch` URLs, not HTML | both | No PR pins in manifest |
| D4 | OAuth-first; `ANTHROPIC_API_KEY` not in repo | both | Unauthenticated session (reports fail) |
| D5 | Claude Code GitHub App installed on `agentbloggers` | both | GitHub MCP tools absent |
| D6 | `/web-setup` token still valid | cloud | Local session |
| D7 | `GH_TOKEN` SSO-authorized for GHE audit log | both | `GH_TOKEN` lacks `admin:org` |
| D8 | Actions pinned by SHA; Dependabot enabled | both | No workflows yet |
| D9 | `main` ruleset enforces reviews + checks + linear + signing | both | `GH_TOKEN` lacks `admin:repo` |
| D10 | `src/web/<domain>/` has `README.md` for multi-file dirs | both | — |
| D11 | Stream-idle-timeout resilience substrates present (env file + otel table + Redis cache design) | both | — |

## How these are run

The SessionStart `type: "agent"` hook in `.claude/settings.json`
spawns a subagent with a 120s timeout that iterates these files.
Each eval returns `{"ok": bool, "reason": str}` stream-json. The
hook is advisory — failures never block session start.

See `src/web/prompt-evals/README.md` for the general eval harness
shape and `https://code.claude.com/docs/en/hooks-guide.md#agent-based-hooks`
for the primitive.

## Adding a new decision

1. Write the D-level decision into the plan file first, with
   `wa_provenance:` mapping to the specific WA page(s) it derives
   from.
2. Create `D<N>-<slug>.eval.md` here with the same `wa_provenance`
   block in frontmatter — the eval inherits the provenance.
3. Keep evals under ~60 lines. Scorer must be a bash predicate
   (or a short python3 -c snippet), not prose.
4. Every eval must specify a `skip condition` — a scenario where
   the eval is not applicable — so a session without the required
   context doesn't generate false-negatives.

## Source

- `https://code.claude.com/docs/en/hooks-guide.md` (agent-based hooks)
- `https://wellarchitected.github.com/library/overview/release-notes/#2026-q1`
