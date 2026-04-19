# polyrepo-engineering

GitHub Well-Architected Q1 2026 — implementing-polyrepo-engineering.

## Context

"GitHub primitives (issues, pull requests, workflows) are repo-scoped by
design." Scaling beyond a single repo means choosing a coordination
model early and committing to it. This file documents the 8-step
implementation the WA recommendation prescribes, maps our current position
against each step, and names the concrete artifacts we create along the way.

Cross-links:
- `src/web/wellarchitected/README.md` — framework overview and status table
- `src/web/enterprise/README.md` — Claude Code Max, GHE, Cloudflare targets
- `src/web/dependencies/manifest.yaml` — the seed integration manifest
- `src/web/prompt-evals/decisions/D9-rulesets-enforced.eval.md`

---

## Step 1 — Establish the integration layer (meta-repo)

The integration layer is the single canonical source of truth for
cross-repo configuration: shared tooling versions, reusable workflow
definitions, and the dependency manifest.

**WA guidance:** Create a parent tracking issue in the integration repo
with scope, impacted repos, and acceptance criteria. The integration repo
owns the `components.lock` / `versions.json` manifest.

**Our position (in progress, intra-repo):**
`src/web/dependencies/manifest.yaml` is the seed manifest. It lives inside
`agentdatamodels` until at least one sibling repo graduates. When siblings
exist, the manifest moves to a dedicated `agentbloggers/integration` repo.

Manifest structure (current):

```yaml
# src/web/dependencies/manifest.yaml
pinned_cli: "@anthropic-ai/claude-code@2.1.114"
wellarchitected:
  release: "2026-Q1"
  recommendations_q1_2026:
    new:
      - implementing-polyrepo-engineering
      - managing-dependency-threats
      - expanding-enterprise-custom-agents-context
```

Future `versions.json` shape for multi-repo:

```json
{
  "cli": "@anthropic-ai/claude-code@2.1.114",
  "agent_sdk": "@anthropic-ai/claude-agent-sdk@0.2.111",
  "schema_version": "2026.01.30"
}
```

---

## Step 2 — Introduce the change-set pattern

Every change that touches more than one repo must carry a `CHG-XXXX`
identifier. The identifier becomes:

- The branch prefix: `changeset/CHG-XXXX/<slug>`
- A GitHub label: `changeset:CHG-XXXX`
- The parent tracking issue title prefix in the integration repo

See `src/web/wellarchitected/polyrepo-changesets.md` for the full
CHG-XXXX spec, branch naming, label naming, and Projects v2 custom fields.

**Our position (not started):** No `CHG-NNNN` scheme yet. We use
`$CLAUDE_CODE_REMOTE_SESSION_ID` as a session trace — that is the
semantic analog but it is not a cross-repo change-set identifier.

---

## Step 3 — Establish branching and merge coordination

All Claude-authored branches already follow the `claude/*` prefix per
Routines convention. For multi-repo work the target pattern is:

- **Feature branches:** `changeset/CHG-XXXX/<slug>` in each affected repo
- **Integration candidates:** `integration/CHG-XXXX` in the integration
  repo; holds merged candidates from all sibling branches before release
- **Release train:** `release/system-2026.01.30` — a single tag applied
  across all repos when the change-set passes integration tests

Branch protection on `main` in every repo is enforced via repository
rulesets (D9). No branch may merge without the integration-candidate CI
passing.

**Our position (partial):** Claude branches land on `claude/*`. No
integration branches exist because there is only one repo.

---

## Step 4 — Governance for reusable workflows

"Treat shared CI/CD workflows like a product: stable inputs/secrets/outputs
contract, semantic versioning with major tags (v1, v2), changelogs, and
migration guides."

The target structure in the integration repo:

```
.github/
  workflows/
    graphql-web.yml       # reusable: call with `uses: …@v1`
    release.yaml          # release-train runner
    lint-and-test.yml     # callable by every sibling
```

Semantic versioning rules for reusable workflows:
- **Major tag** (`v1`, `v2`) — public, stable, signable by consumers
- **Minor tag** (`v1.2`) — optional second-level; consumers can opt in
- **Commit SHA** — what D8 requires in `uses:` lines in all callers

Changelogs and migration guides live at
`docs/workflows/<name>/CHANGELOG.md` within the integration repo.

**Our position (not started):** No `.github/workflows/` yet. `Makefile`
is the current versioned-delivery surface and serves the same purpose
during the intra-repo phase.

---

## Step 5 — Release governance

Release tags follow the pattern `system-2026.01.30` — year.month.day,
no SemVer for the system release because multiple repos are in flight
and calendar versioning is unambiguous.

Individual repos still use SemVer for their own releases. The system
release tag is applied to the integration repo manifest.

The `release.yaml` workflow:
1. Reads `versions.json` / `components.lock` from the manifest.
2. Verifies all sibling repos have a passing CI run at the pinned SHA.
3. Tags the integration repo `system-YYYY.MM.DD`.
4. Creates a GitHub Release with the diff of `components.lock` vs
   the previous tag.

**Our position (not started):** No version tags, no system-release
manifest. Next step: tag `manifest-2026.04.19` on the current
`manifest.yaml` state.

---

## Step 6 — Security campaigns (GHAS)

GitHub Advanced Security is available via the `agentbloggers` enterprise
subscription. The WA recommendation maps directly to the SSDF practice
groups — see `src/web/wellarchitected/nist-ssdf-implementation.md` for
the full SSDF mapping.

Campaigns to configure:

| Campaign type | GHAS surface | Status |
|---|---|---|
| Secret scanning | Org-level, all repos | Not configured |
| Dependabot alerts | `.github/dependabot.yml` | Not configured (D8) |
| Code scanning (CodeQL) | `codeql-analysis.yml` per repo | Not configured |
| Dependency review | `dependency-review-action` on PRs | Not configured |

The `orchestrator/executor pattern — a GitHub App with least-privilege
permissions` applies here too: the GHAS campaign runner is a separate
GitHub App (or reusable workflow) that the integration repo orchestrates.

**Our position (not configured):** GHAS available; no campaigns running.
D8 activates once CI workflows land.

---

## Step 7 — Orchestrator / executor pattern

"Orchestrator/executor pattern — a GitHub App with least-privilege
permissions." The Claude Code GitHub App installed via `/install-github-app`
is our primary orchestrator. Its permission set:

```
contents: read
pull_requests: write
issues: write
actions: read
```

In `.claude/agents/`, the main session IS the orchestrator and subagents
are the executors. The `routine-builder` and `plugin-integrator` agents
map cleanly onto this pattern. Each subagent:

- Receives a scoped task from the orchestrator
- Operates only within its declared tool set
- Reports results back as structured JSON
- Never escalates permissions

**Our position (started):** `.claude/agents/` roster is active. The
GitHub App install (D5) provides the OIDC-equivalent for Anthropic auth.

---

## Step 8 — Unified experience (panes of glass)

The "unified experience" goal is: a developer or agent can answer
"what is the state of change-set CHG-XXXX across all repos?" from one
place.

Target surfaces:

| Surface | What it shows |
|---|---|
| GitHub Projects v2 | All issues/PRs for a change-set; custom fields: CHG ID, team, priority, SLA, status |
| Integration repo tracking issue | Scope + impacted repos + acceptance criteria |
| `components.lock` diff | What changed in each sibling at release |
| `make doctor-web` output | Health of the local environment for THIS repo |
| `.claude/graphql-runs/` | Per-session GraphQL reports |

Projects v2 custom fields to configure (per WA):

| Field | Type | Values |
|---|---|---|
| Change-set ID | Text | `CHG-XXXX` |
| Team | Single select | platform, security, product |
| Priority | Single select | P0, P1, P2 |
| SLA | Date | target merge/release date |
| Status | Single select | draft, integration, released, abandoned |

**Our position (partial):** `make doctor-web`, `.claude/graphql-runs/`,
and `/tasks` provide visibility inside one repo. No Project board exists
yet. Next action: create the GitHub Project and configure the five fields
above.

---

## Four coordination models

| Model | Best for | Artifact | Tradeoff |
|---|---|---|---|
| (1) Integration branch / release-train | Many repos shipping together on a schedule | `integration/CHG-XXXX` branch in meta-repo | Coordination overhead; works best with infrequent large releases |
| (2) Meta-repo manifest | Pinned dependency versions across repos | `components.lock` / `versions.json` in integration repo | Low ceremony; can drift if updates aren't automated |
| (3) Versioned artifacts | Shared libraries, reusable workflows | Published npm package or `@vN` workflow tag | Requires semantic versioning discipline and changelog hygiene |
| (4) Linked PRs with merge gating | Fast-moving micro-service deploys | `changeset:CHG-XXXX` label + merge queue | Complex to set up; most powerful for true CD |

For `agentbloggers` in Q1 2026: model (2) is active (embryonic). Model
(3) is the target for reusable workflows. Models (1) and (4) become
relevant once 3+ sibling repos are in flight.

---

## Phase roadmap

| Phase | Focus | Steps covered | Status in this repo |
|---|---|---|---|
| standardize-and-observe | Branch hygiene, manifest, change-set IDs | 1, 2, 3 | Partial — `claude/*` branches exist; manifest intra-repo; CHG not started |
| integration-layer-setup | Extract meta-repo, reusable workflows, Projects | 4, 5, 8 | Not started |
| orchestration-rollout | GitHub App, GHAS campaigns, security automation | 6, 7 | Started (`.claude/agents/`); GHAS not configured |
| security-campaign-automation | Full SSDF implementation, attestations, SBOM | Ongoing | Not started |

The status table at `src/web/wellarchitected/README.md` lines 39-48 is
the live record. Update it as each step moves.

---

## Critical principle

"Avoid floating references (`@main`) in production paths. Pin workflows
and dependencies to stable references: reusable workflows at `@vN` or
`@vN.N.N`, and integration manifests at release tags or SHAs."

Our `src/web/dependencies/manifest.yaml` is the enforcement surface.
When `make graphql-web` flags drift, that is the intended early-warning
signal.

---

## Source

- `https://wellarchitected.github.com/library/architecture/recommendations/implementing-polyrepo-engineering/`
- Snapshot: `src/web/dependencies/snapshots/implementing-polyrepo-engineering-2026-04-19.md` (populated by `make graphql-web` on 2026-04-19).
- `src/web/dependencies/manifest.yaml` (release: 2026-Q1)
- `src/web/wellarchitected/README.md`
- `src/web/prompt-evals/decisions/D9-rulesets-enforced.eval.md`
