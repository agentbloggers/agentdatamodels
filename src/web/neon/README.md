# neon

Neon serverless Postgres — per-subagent database branches via Git
post-checkout hook. Source:
`https://neon.com/guides/isolated-subagents-neon-branching`.

## Why this matters for us

Our subagent roster includes `memory: project` agents whose
learnings are repo-scoped. When we add **Postgres-backed** memory
(eval store, run reports, GraphQL cache, benchmark results), each
subagent needs its own DB sandbox — otherwise parallel subagents
step on each other's writes.

Neon's "isolated subagents" pattern solves this: a Git post-checkout
hook auto-creates a matching DB branch for each worktree, injects
its `DATABASE_URL`, and tears down when the worktree is cleaned.

## How the pattern works

1. Subagent is spawned with `isolation: worktree` (see our
   `src/web/subtasks/README.md`).
2. Git creates the worktree → post-checkout hook fires.
3. Hook calls Neon API:
   - If a branch named `<git-branch>` exists: get its connection
     string
   - Else: create a new branch from `main`, get connection string
4. Hook writes `DATABASE_URL=<pooled-conn-string>` to the subagent's
   `.env`.
5. Subagent code reads `DATABASE_URL` and runs isolated.
6. When the subagent finishes, the Neon branch persists so reviewers
   can inspect DB state before merging.

## Required env vars

| Var | Set by | Used by |
|---|---|---|
| `NEON_API_KEY` | Cloud env / user config | post-checkout hook |
| `NEON_PROJECT_ID` | Cloud env / user config | post-checkout hook |
| `DATABASE_URL` | **populated by hook** at worktree creation | subagent code |

`NEON_API_KEY` and `NEON_PROJECT_ID` must be set in the cloud
environment's env-var panel so Routines can use them. Do NOT commit.

## Neon CLI commands used by the hook

```bash
neon branches get "$BRANCH_NAME"          --project-id "$NEON_PROJECT_ID"
neon branches create --name "$BRANCH_NAME" --project-id "$NEON_PROJECT_ID"
neon connection-string "$BRANCH_NAME" --pooled --project-id "$NEON_PROJECT_ID"
```

Install Neon CLI:
```bash
npm install -g neonctl
# or
curl -fsSL https://neon.com/install.sh | sh
```

## Subagent frontmatter for this pattern

```yaml
---
name: db-worker
description: Runs migrations / data tasks in an isolated branch
isolation: worktree          # triggers the hook
background: true             # async by default
permissionMode: bypassPermissions   # safe: changes are sandboxed
---
```

`bypassPermissions` is safe ONLY because the worktree + DB branch
are sandboxed. Do not use on non-worktree subagents.

## Postgres version target

User wants Postgres 18. As of this writing:

- Upstream Postgres 18 released Sept 2025.
- Neon tracks PG releases closely; check
  `https://neon.com/docs/postgresql/postgres-version` for current
  support.
- Our `manifest.yaml` records `postgres_target: 17` until Neon ships
  PG 18 as default. Bump when available.

The cloud env's preinstalled Postgres (per
`/en/claude-code-on-the-web`) is PostgreSQL 16. That's fine for
local development; Neon is the production / routine target.

## Current status

**Documented, not yet provisioned.** Activate when:

- A component needs durable server-side state (beyond repo files)
- We have ≥ 2 concurrent subagents writing to the same schema
- A Routine needs cross-run state not cleanly expressed in git

Provisioning checklist:

1. Create a Neon project for `agentdatamodels`.
2. Add `NEON_API_KEY` + `NEON_PROJECT_ID` to cloud env vars.
3. Install Neon CLI: `npm install -g neonctl`.
4. Install the post-checkout hook at `.git/hooks/post-checkout`
   (script: copy from Neon guide, adapted to our worktree layout).
5. Test: `git worktree add ../ws-test test-branch` → confirm
   `DATABASE_URL` is set in `../ws-test/.env`.

## Directives

- Never commit `NEON_API_KEY` or connection strings to the repo.
- Always use the **pooled** connection string (Neon has separate
  `direct` and `pooled` URLs; pooled is safer for concurrent
  subagents).
- Clean up orphan branches periodically — Neon bills per GB-month,
  and unused branches accumulate.
- For Routines that don't need a DB, skip the worktree + hook — no
  need to spin up a branch.

## Related

- `src/web/subtasks/README.md` — `isolation: worktree` semantics
- `src/web/enterprise/README.md` — where Neon sits in the stack
- `src/web/dependencies/manifest.yaml` — `neondatabase` watched repos

## Source

- `https://neon.com/guides/isolated-subagents-neon-branching`
- `https://neon.com/docs/reference/cli-branches`
- `https://github.com/orgs/neondatabase/repositories`
