# wellarchitected

GitHub's Well-Architected Framework (`wellarchitected.github.com`) —
what we adopt, what we defer, and why.

## Status

**Reference-only.** We document the framework here because it maps
directly onto where this repo is heading (the user's 20 Cloudflare
`agent*.com` domains are candidate sibling repos). We are **not**
implementing the polyrepo layer yet — per user direction, device
surfaces stabilize first.

## Layers

Per `https://wellarchitected.github.com/library/overview/layers/`:

| Layer | What lives here |
|---|---|
| **Architecture** | System-level patterns: polyrepo vs monorepo, integration layer, change sets |
| **Delivery** | Reusable workflows, release governance, orchestration |
| **Security** | Advanced Security campaigns, secret scanning, SBOM |
| **Experience** | Projects, dashboards, correlation IDs |

Each recommendation is written as "Problem → Approach → Evidence".
Cite by recommendation ID when referencing in our docs.

## Getting-started checklist

Per `https://wellarchitected.github.com/library/overview/getting-started-checklist/`:

1. Pick a scenario that matches your org's scale.
2. Inventory your repos + workflows.
3. Identify your integration layer candidate (where cross-repo
   contracts live).
4. Pick a change-set identifier scheme (`CHG-NNNN` is the
   recommended default).
5. Adopt one reusable workflow before branching out.

Our progress:

- ✅ Inventory — `src/web/dependencies/manifest.yaml`
- ✅ One reusable unit — the `track-upstream` + `graphql-deps`
  scripts, exposed via `make graphql-web`
- ⏳ Integration layer — deferred (single repo for now)
- ⏳ Change-set IDs — deferred
- ⏳ Reusable workflows (GitHub Actions) — deferred

## Polyrepo engineering (deferred)

Per `.../implementing-polyrepo-engineering/`:

Three core principles:

1. **Integration layer (meta-repo)** — a dedicated repo answering
   "do these component versions work together?" via a pinned
   manifest. Our `src/web/dependencies/manifest.yaml` is the seed
   of this pattern (currently intra-repo).
2. **Change sets** — parent tracking issue in the meta-repo, child
   issues per affected component, linked by `CHG-NNNN`. Not yet.
3. **Branching & merge coordination** — pick one of: integration
   branches, meta-repo manifests, versioned artifacts, linked PRs
   with merge gating. We'll pick once we have ≥ 2 repos to
   coordinate.

Eight implementation steps (not started):

1. Establish integration layer (meta-repo)
2. Implement change-set pattern
3. Choose branching/merge coordination model
4. Set up reusable workflow governance
5. Define release governance (component vs system releases)
6. Implement security campaigns with GitHub Advanced Security
7. Deploy orchestration model
8. Compose unified experience via Projects + dashboards

## What we're doing *now* that aligns with the framework

- **Pinning everything**: `manifest.yaml` pins Node, CLI, SDK, every
  watched package + doc-page hash. Upstream Well-Architected rule:
  "Avoid floating refs (`@main`) in production paths."
- **Versioned interface**: `make *-web` targets are our versioned
  delivery surface — every cloud session runs the same make targets.
- **Correlation IDs**: we use `CLAUDE_CODE_REMOTE_SESSION_ID` as the
  cross-artifact trace (PR bodies, commit footers, eval run
  reports). Analogous to `CHG-NNNN`.

## Critical principle (quoted)

> "Avoid floating refs (`@main`) in production paths. Pin workflows
> and dependencies to stable references."

Our `manifest.yaml` is the enforcement surface. When
`make graphql-web` flags drift, that's the intended early-warning
signal.

## Sibling-repo strategy (future)

When we flip from single-repo to polyrepo (see
`src/web/enterprise/README.md` for the 20 domain list), this repo
becomes the **integration layer**:

- Each sibling repo (`agent<thing>.com`) pins versions of shared
  components (skills, MCP servers, plugin set) via this repo's
  `manifest.yaml`.
- Change sets: a PR to a sibling repo opens a `CHG-NNNN` tracking
  issue here.
- Reusable workflows live under `.github/workflows/` in this repo,
  referenced by siblings as `@<immutable-sha>`.

## Directives

- Cite the framework's recommendation IDs when justifying an
  architectural decision in a PR body.
- When in doubt between monorepo and polyrepo, stay with what we
  have (single repo) until a concrete cross-repo contract emerges.
- Floating refs (`@main`, `@latest`) are acceptable in
  **read-only** discovery queries. They are forbidden in anything
  that consumers depend on.
- The meta-repo pattern only works if the pinning surface is
  `manifest.yaml` — don't add a second pinning mechanism.

## Source

- `https://wellarchitected.github.com/library/`
- `https://wellarchitected.github.com/library/overview/layers/`
- `https://wellarchitected.github.com/library/overview/getting-started-checklist/`
- `https://wellarchitected.github.com/library/architecture/recommendations/implementing-polyrepo-engineering/`
