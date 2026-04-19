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

## Source

- `https://docs.anthropic.com/en/docs/claude-code/settings` (Max OAuth)
- `https://docs.github.com/en/enterprise-cloud@latest/`
- `https://huggingface.co/docs/hub/security-tokens`
- Cloudflare dashboard (user's registered domains)
