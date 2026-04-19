# enterprise

Enterprise-tier surfaces this repo has access to — Claude Code Max,
GitHub Enterprise, HuggingFace premium, and 20 Cloudflare domains.

## Claude Code Max (OAuth)

The repo's org is associated with a Claude Code Max subscription.
Authentication for that sub uses an **OAuth token**, not an API key:

| Var | Purpose |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | OAuth token for Max-account routing |
| `ANTHROPIC_API_KEY` | Direct API key (separate billing path) |

The CLI picks the OAuth token when both are present and the user has
logged in via `/login`. For scripts and routines, prefer setting
`CLAUDE_CODE_OAUTH_TOKEN` explicitly so the run stays on the Max plan
rather than spilling onto the API key.

**Directive:** For any Routine or `claude -p --bare` that represents
user-interactive work (code review, refactor, PR fix), prefer
`CLAUDE_CODE_OAUTH_TOKEN`. For pure automation that would bill
differently (batch, nightly jobs), an API key is fine.

## GitHub Enterprise

The `agentbloggers` org sits under a GitHub Enterprise subscription.
Implications:

| Capability | Notes |
|---|---|
| Advanced Security | Secret scanning, code scanning, dependency review — queryable via GraphQL |
| Audit log | GraphQL API at `organization(login).auditLog(first: N)` (GHE only) |
| SAML SSO | PATs must be SSO-authorized; fine-grained PATs recommended |
| Copilot | Separate license; not assumed in any of our workflows |
| Org-level rulesets | `repositoryRulesets` queryable via GraphQL |
| Enterprise accounts | `enterprise(slug)` root query for cross-org reporting |

Scope the `GH_TOKEN` used by our scripts to the minimum needed:
`read:org, repo, workflow, project` for `make graphql-web`. Never
use a PAT with `admin:org` in a cloud session.

## HuggingFace premium

Premium subscription present but currently unused. When we activate:

| Use case | Path |
|---|---|
| Hosted inference (open models) | `huggingface_hub` SDK or raw HTTPS with `HF_TOKEN` |
| Private model hosting | Private repos under HF org; clone with token |
| Datasets access | `datasets` library; some private datasets need premium |
| Spaces (hosted apps) | Useful for public demos of agent tooling |

Env var: `HF_TOKEN`. Never commit.

**Directive:** Don't route Claude Code work through HF inference —
our subscription covers inference elsewhere. HF is the right surface
for: hosting a static demo of the benchmark dashboard (Spaces),
pulling embedding models for local RAG, publishing datasets.

## Cloudflare domains (20, all empty)

Registered via Cloudflare (per screenshots):

```
agentchangelogs.com       agentsubdomains.com
agentcoauthors.com        agentsubtasks.com
agentcrawls.com           agentsystemcards.com
agentdatamodels.com       ← this repo
agentdatawarehouses.com   agenttables.com
agentdiagrams.com         agenttodos.com
agentiwikis.com           agenttrademarks.com
agentknowledgeworkers.com
agentloggers.com
agentportfolios.com
agentpublishers.com
agentreaders.com
agentregistrations.com
```

**Status:** reserved as future polyrepo targets; do not provision
yet (per user direction).

When we flip to polyrepo (see `src/web/wellarchitected/`):

- Each domain maps to one sibling repo (`agentbloggers/agent<thing>`).
- This repo (`agentdatamodels`) becomes the **integration layer**
  — pins shared skills / MCP servers / plugin set for siblings.
- Cloudflare handles DNS, Pages for static sites, Workers for
  serverless endpoints (e.g. a `/fire`-wrapper per routine).

Naming convention for siblings:

- GitHub repo: `agentbloggers/agent<thing>`
- Domain: `agent<thing>.com` (apex) + `www.agent<thing>.com`
- Cloudflare Pages project: `agent-<thing>`
- Claude Code on the web env: `agent<thing>-prod`,
  `agent<thing>-dev`

## How these surfaces compose for a routine

A typical nightly Routine in the target state:

1. Fires via schedule or webhook.
2. Uses `CLAUDE_CODE_OAUTH_TOKEN` → Max-plan billing.
3. `GH_TOKEN` (fine-grained, org-scoped) for GraphQL queries across
   sibling repos.
4. `NEON_API_KEY` + `NEON_PROJECT_ID` for subagent DB branches.
5. Writes results to a Cloudflare KV / D1 backing a sibling domain.
6. Links session back via `$CLAUDE_CODE_REMOTE_SESSION_ID`.
7. `HF_TOKEN` used only if task involves HF-hosted models or Spaces.

## Directives

- **Never** commit `CLAUDE_CODE_OAUTH_TOKEN`, `GH_TOKEN`,
  `NEON_API_KEY`, `HF_TOKEN`, or Cloudflare API tokens. All live in
  cloud environment env-var panels or user shell env.
- For Routines, prefer the **most specific** token path:
  - `CLAUDE_CODE_OAUTH_TOKEN` over `ANTHROPIC_API_KEY` for Max work
  - Fine-grained PAT over classic PAT for `GH_TOKEN`
  - Scoped HF token over account-wide token
- Don't provision new Cloudflare domains into production without
  the integration-layer pattern in place.
- When a sibling repo graduates from draft, add it to
  `src/web/dependencies/manifest.yaml` under a new `orgs.agentbloggers`
  section so it's tracked.

## `/install-github-app` flow (Well-Architected anchor)

**WA provenance:** [Implementing Polyrepo Engineering](https://wellarchitected.github.com/library/architecture/recommendations/implementing-polyrepo-engineering/)
— "orchestrator/executor pattern — a GitHub App with
least-privilege permissions." [Actions Security](https://wellarchitected.github.com/library/application-security/recommendations/actions-security/)
#1 — "OIDC eliminates the need for long-lived credentials in
Actions secrets." The Claude Code GitHub App is our OIDC-
equivalent for Anthropic auth on `agentbloggers`.

What it provisions on the `agentbloggers` org:

1. The Claude Code GitHub App installation at the org level
   (repo-scoped opt-in allowed).
2. `CLAUDE_CODE_OAUTH_TOKEN` as an **org-level secret** readable
   from every Actions workflow under the org.
3. The app's least-privilege permission set: `contents: read`,
   `pull_requests: write`, `issues: write`, `actions: read`.

How workflows consume it (see
`src/web/dependencies/snapshots/github-actions-*.md`):

```yaml
jobs:
  claude:
    runs-on: ubuntu-latest
    permissions: {}   # workflow-level deny-all (WA Actions Security #3-4)
    steps:
      - uses: anthropics/claude-code-action@<40-hex-sha>  # v1.x (WA #2)
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

Validate with D5 (`src/web/prompt-evals/decisions/D5-github-app-installed.eval.md`).

## `/web-setup` flow (cloud sessions only)

**WA provenance:** [Expanding Enterprise Custom Agents Context](https://wellarchitected.github.com/library/architecture/recommendations/expanding-enterprise-custom-agents-context/)
— the PAT-with-`repo`-scope pattern is the canonical path for
MCP-consumer agents fetching context. [NIST SSDF](https://wellarchitected.github.com/library/scenarios/nist-ssdf-implementation/)
PS.1 — SAML/OIDC SSO + MFA for repository access.

What it does: one-time sync of your local `gh` CLI token into the
cloud environment's env-var panel. After `/web-setup` runs,
`$GH_TOKEN` is populated in every new cloud session on
`claude.ai/code`, and `gh auth status` reports authenticated.

Re-run cadence: the token inherits your local gh session's
expiry (typically 8 hours for SSO-authorized PATs, indefinite
for non-SSO tokens). Re-run `/web-setup` whenever `gh auth status`
fails or when GitHub reports the SSO authorization has lapsed.

Validate with D6 (`src/web/prompt-evals/decisions/D6-web-setup-valid.eval.md`),
which skips on local sessions.

## SSO-authorized PAT requirements

**WA provenance:** [NIST SSDF](https://wellarchitected.github.com/library/scenarios/nist-ssdf-implementation/)
PS.1 — "SAML/OIDC SSO, MFA enforcement"; RV.1 —
"Stream audit logs to SIEM systems for compliance retention and
correlation." The GHE audit log is the SSDF RV.1 control
surface; reaching it requires a SSO-authorized PAT.

For `GH_TOKEN` against `agentbloggers`:

- **Use fine-grained PATs**, not classic. Scope to the specific
  repos the job needs.
- **Required scopes** for `make graphql-web` + our
  scripts: `contents: read`, `metadata: read`, `workflows: read`,
  `projects: read`. For D7 to run: add `admin:org` or
  `read:audit_log`.
- **Authorize the PAT against the `agentbloggers` SAML provider**
  in your GitHub user token settings BEFORE use. Without this,
  `gh api` returns 200 on non-SSO fields (e.g. `/repos/<repo>`)
  but 403 on `organization.auditLog`, `repositoryRulesets`, and
  anything under `enterprise(slug:…)`.
- **Failure mode to watch for**: `gh auth status` returns 200
  BUT D7 returns "Resource not accessible by personal access
  token". That's the SSO-not-authorized signal.

Validate with D7 (`src/web/prompt-evals/decisions/D7-ghe-sso-authorized.eval.md`),
which skips gracefully when the PAT lacks the required scopes.

## Migration to `.github-private`

**WA provenance:** [Expanding Enterprise Custom Agents Context](https://wellarchitected.github.com/library/architecture/recommendations/expanding-enterprise-custom-agents-context/)
— "store additional context files in a structured knowledge
directory within the `.github-private` repository." The WA layout
is `knowledge/<domain>/*.md` fetched via GitHub MCP `get_file_contents`.

Target state (when polyrepo lands):

```
agentbloggers/.github-private/
└── knowledge/
    └── claude-code/       # ← mirrors src/web/ from this repo
        ├── README.md
        ├── primitives.md
        ├── directives.md
        ├── surfaces.md
        ├── enterprise/
        ├── wellarchitected/
        └── …
```

`src/web/` in this repo is the **precursor**. Its `<topic>/README.md`
convention (enforced by D10) already matches the WA-sanctioned
`knowledge/<domain>/README.md` layout. When we graduate polyrepo,
the migration is `git mv src/web/ .github-private/knowledge/claude-code/`
and nothing else.

Sibling repos reach the knowledge base via GitHub MCP:

```
mcp__github__get_file_contents(
  owner="agentbloggers",
  repo=".github-private",
  path="knowledge/claude-code/primitives.md"
)
```

The PAT provisioned by D4+D6 already has `repo` scope, which is
what `.github-private` access requires.

Validate with D10 (`src/web/prompt-evals/decisions/D10-knowledge-layout.eval.md`).

## Validation tests

All five enterprise-auth surfaces above are drift-checked by the
agent hook in `.claude/settings.json` on every session start. The
relevant evals:

| Eval | Validates |
|---|---|
| D4 | OAuth-first token strategy; `ANTHROPIC_API_KEY` absent from repo |
| D5 | `/install-github-app` completed (GitHub MCP reachable) |
| D6 | `/web-setup` token still valid (cloud only) |
| D7 | `GH_TOKEN` SSO-authorized for GHE audit log |
| D10 | `src/web/<domain>/` layout ready for `.github-private/knowledge/` migration |

Run manually with `make doctor-web` plus `DOCTOR_INCLUDE_GHE=1`
to exercise D7. The doctor target exits 0 even on eval failures
— this harness is advisory, not blocking.

## Source

- `https://docs.anthropic.com/en/docs/claude-code/settings` (Max OAuth)
- `https://docs.github.com/en/enterprise-cloud@latest/`
- `https://huggingface.co/docs/hub/security-tokens`
- Cloudflare dashboard (user's registered domains)
- `https://wellarchitected.github.com/library/overview/release-notes/#2026-q1`
- `https://wellarchitected.github.com/library/architecture/recommendations/implementing-polyrepo-engineering/`
- `https://wellarchitected.github.com/library/architecture/recommendations/expanding-enterprise-custom-agents-context/`
- `https://wellarchitected.github.com/library/application-security/recommendations/actions-security/`
- `https://wellarchitected.github.com/library/scenarios/nist-ssdf-implementation/`
