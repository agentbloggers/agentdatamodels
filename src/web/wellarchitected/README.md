# wellarchitected

GitHub's Well-Architected Framework (`wellarchitected.github.com`) —
how we're applying it to `agentdatamodels` and its future siblings.

## Framework shape

Per `/library/overview/layers/`, the framework has **five pillars**:

1. **Productivity** — team efficiency, workflow streamlining
2. **Collaboration** — cross-team practices on GitHub
3. **Application Security** — security across the dev lifecycle
4. **Governance** — access, compliance, policy
5. **Architecture** — scalable, resilient GitHub envs

Each pillar has: **design principles** (how to achieve the what),
**checklists** (questions + data points for evaluation), and
**recommendations** (scenario-based Content Library articles with
tradeoffs).

Per `/library/overview/getting-started-checklist/`, the intended
on-ramp is:

1. Engage with GitHub or a Partner expert (we skip — self-serve)
2. Review the five pillars
3. Initial GitHub environment review against pillars
4. Stakeholder interviews (we skip — single-author repo)
5. Analysis and scoring
6. Recommendation review

## Honest status (not "deferred")

User correction: the polyrepo work is **in flight**, not deferred.
We've been making the mistake of calling early structural decisions
"just setup" when they ARE the polyrepo foundation.

### Where we stand against the 8 polyrepo-engineering steps

| # | Step | Status | Evidence in repo |
|---|---|---|---|
| 1 | Integration layer (meta-repo) | ⚠️ **in progress (intra-repo)** | `src/web/dependencies/manifest.yaml` is the seed manifest; currently lives *inside* this repo — will be extracted into a dedicated meta-repo when sibling repos graduate |
| 2 | Change-set pattern | ❌ not started | No `CHG-NNNN` scheme yet — we use `$CLAUDE_CODE_REMOTE_SESSION_ID` for session trace, which is the analog but not the same |
| 3 | Branching/merge coordination | ⚠️ partial | All Claude work on `claude/*` branches (per Routines convention); no integration branches yet |
| 4 | Reusable workflow governance | ❌ not started | No `.github/workflows/` yet; `Makefile` is the current versioned-delivery surface |
| 5 | Release governance | ❌ not started | No version tags, no system-release manifest |
| 6 | Security campaigns (GHAS) | ❌ not configured | GHAS available via enterprise subscription; no secret-scanning / Dependabot / code-scanning campaigns yet |
| 7 | Orchestration model | ✅ **started** | `.claude/agents/` IS the orchestrator/executor pattern — main session orchestrates, subagents execute; `routine-builder` and `plugin-integrator` map cleanly onto the pattern |
| 8 | Unified experience | ⚠️ partial | `/tasks`, `make doctor-web`, `.claude/graphql-runs/` reports give panes-of-glass; no Project board yet |

### Against the five pillars

| Pillar | Where we're investing |
|---|---|
| **Productivity** | `CLAUDE.md` + subagents + skills; every `make *-web` target is idempotent |
| **Collaboration** | Seed prompts + docs-librarian subagent mean a new contributor's first PR can follow the existing pattern |
| **Application Security** | `.claude/settings.json` permissions; plugin install trust rules; `alignment/` topic in `src/web/` |
| **Governance** | `manifest.yaml` pins; `upstream-hashes.json` + `make graphql-web` as the audit surface |
| **Architecture** | The topic this folder is tracking — polyrepo readiness |

## Where to go next

The detailed recommendation lives at
**[`polyrepo-engineering.md`](./polyrepo-engineering.md)** — the full
8-step implementation with tradeoff tables, coordination-model
options, and the phased adoption roadmap.

Near-term plan items that move us up the polyrepo maturity curve:

1. **Introduce change-set IDs.** Choose `CHG-NNNN` format. Start
   using them in PR titles on this repo immediately — they become
   the parent-issue primary key when we extract the meta-repo.
2. **Add the first reusable workflow.** Convert `make graphql-web`
   into a `.github/workflows/graphql-web.yml` that any sibling repo
   can call via `uses: agentbloggers/agentdatamodels/.github/workflows/graphql-web.yml@<sha>`.
3. **Promote `manifest.yaml` to a tagged artifact.** Every change to
   `pinned_cli`, `pinned_node`, or any org pin gets a tag
   (`manifest-2026.04.19` style) so sibling repos can reference an
   immutable ref.
4. **Set up GitHub Projects.** Track this repo's issues + future
   sibling-repo issues in a single Project, with custom fields for
   change-set ID, team, and SLA.

## Critical principle (quoted from the recommendation)

> "Avoid floating references (`@main`) in production paths. Pin
> workflows and dependencies to stable references: reusable
> workflows at `@vN` or `@vN.N.N`, and integration manifests at
> release tags or SHAs. Use PR SHAs only in integration candidates,
> then promote to tags."

Our `src/web/dependencies/manifest.yaml` is the enforcement surface.
When `make graphql-web` flags drift, that's the intended
early-warning signal.

## Related topics in this repo

- `src/web/dependencies/` — our (embryonic) integration manifest
- `src/web/enterprise/` — Cloudflare domains reserved as future
  sibling repos; Claude Code Max OAuth; GitHub Enterprise
- `src/web/subtasks/` — subagent (executor) patterns
- `.claude/agents/` — our orchestrator/executor roster

## Source

- `https://wellarchitected.github.com/library/`
- `https://wellarchitected.github.com/library/overview/layers/`
- `https://wellarchitected.github.com/library/overview/getting-started-checklist/`
- `https://wellarchitected.github.com/library/architecture/recommendations/implementing-polyrepo-engineering/`
  (complete content mirrored in `polyrepo-engineering.md`)
