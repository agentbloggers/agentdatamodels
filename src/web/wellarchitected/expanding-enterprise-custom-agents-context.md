# expanding-enterprise-custom-agents-context

GitHub Well-Architected Q1 2026 — expanding-enterprise-custom-agents-context.

Custom agents (Copilot extensions, Claude Code sessions, GitHub-hosted
bots) have a 30,000-character definition limit that fills quickly with
inline instructions. The solution is to externalise domain knowledge into
a structured repository and fetch it at runtime via MCP.

Cross-links:
- `src/web/wellarchitected/README.md` — framework overview
- `src/web/enterprise/README.md` — the `.github-private` migration path,
  PAT requirements, and D10 validation
- `src/web/dependencies/manifest.yaml` — `expanding-enterprise-custom-agents-context`
  listed under `recommendations_q1_2026.new`
- `src/web/prompt-evals/decisions/D10-knowledge-layout.eval.md` — the
  eval that enforces layout readiness

---

## The 30k-character constraint

Agent definitions on GitHub (Copilot extensions, custom chat agents)
are capped at approximately 30,000 characters of system-prompt text.
For any non-trivial domain — CI/CD conventions, security patterns,
deployment runbooks — that budget is exhausted by inline documentation.

The WA solution: keep the agent definition short and authoritative
("you are a CI/CD expert; fetch current guidance from the knowledge
repo"), and pull the detail at query time via the GitHub MCP server.

---

## The `.github-private` knowledge repo pattern

Store additional context files in a structured knowledge directory
within the `.github-private` repository on your organization. The
canonical layout is:

```
<org>/.github-private/
└── knowledge/
    ├── <domain>/
    │   ├── README.md              # domain overview
    │   └── <topic>.md             # one file per topic
    └── …
```

For the `agentbloggers` org targeting Claude Code context:

```
agentbloggers/.github-private/
└── knowledge/
    └── claude-code/
        ├── README.md
        ├── primitives.md
        ├── directives.md
        ├── surfaces.md
        ├── enterprise/
        │   └── README.md
        ├── wellarchitected/
        │   └── README.md
        └── …
```

Reference files cited by the WA recommendation:

```
knowledge/ci-cd/github-actions-best-practices.md
knowledge/ci-cd/deployment-workflows.md
knowledge/ci-cd/container-security.md
knowledge/security/authentication-patterns.md
```

These map directly to the `<domain>/<topic>.md` convention.

---

## MCP fetch pattern

The agent fetches context files at query time using `get_file_contents`
from the GitHub MCP server:

```
mcp__github__get_file_contents(
  owner="agentbloggers",
  repo=".github-private",
  path="knowledge/claude-code/primitives.md"
)
```

The PAT must have `repo` scope to read from a private repository.
The recommended credential is stored as an environment secret named
`COPILOT_MCP_GITHUB_PERSONAL_ACCESS_TOKEN` (exact name per WA) in the
Copilot environment `copilot`.

| Config item | Value |
|---|---|
| Environment name | `copilot` |
| Secret key | `COPILOT_MCP_GITHUB_PERSONAL_ACCESS_TOKEN` |
| PAT scope required | `repo` (read access to `.github-private`) |
| MCP tool | `get_file_contents` |
| Fetch pattern | On-demand per query, not bulk-loaded |

---

## How our `src/web/` layout already satisfies D10

`src/web/prompt-evals/decisions/D10-knowledge-layout.eval.md` enforces
that every multi-file subdirectory under `src/web/` has a `README.md`.
This is exactly the `knowledge/<domain>/README.md` shape the WA
recommendation requires.

The eval's decision:

> "Every first-level subdirectory under `src/web/` that contains >1 file
> has a `README.md` at its root, so `git mv` to
> `agentbloggers/.github-private/knowledge/` works without restructuring."

When D10 passes, the migration is a single command:

```bash
git mv src/web/ agentbloggers/.github-private/knowledge/claude-code/
```

No restructuring, no file renames. The `<domain>/README.md` convention
is already the WA-sanctioned layout.

---

## Migration checklist

1. **D10 passes** — all multi-file dirs under `src/web/` have `README.md`.
   Run: `make doctor-web` (or the D10 eval directly).

2. **`.github-private` repo exists** on `agentbloggers` org. Create it as
   a private repo if not present.

3. **PAT created and authorised:**
   - Classic PAT (or fine-grained PAT) with `repo` scope.
   - SSO-authorised against the `agentbloggers` SAML provider.
   - Stored as `COPILOT_MCP_GITHUB_PERSONAL_ACCESS_TOKEN` in the
     `copilot` environment.

4. **`git mv` and push:**
   ```bash
   git mv src/web/ .github-private/knowledge/claude-code/
   git commit -m "chore: migrate src/web to .github-private/knowledge"
   git push
   ```

5. **Update agent definitions** to reference
   `knowledge/claude-code/<file>.md` rather than inlining content.

6. **Validate MCP fetch** works from a test agent session:
   ```
   mcp__github__get_file_contents(
     owner="agentbloggers",
     repo=".github-private",
     path="knowledge/claude-code/README.md"
   )
   ```

---

## Current status

This migration is future work — blocked on two prerequisites:

1. At least one sibling repo in the `agentbloggers` org must exist to
   justify the shared knowledge store (currently this is the only repo).
2. `agentbloggers/.github-private` repo must be created.

Until then, `src/web/` serves as the precursor. Its layout is kept
migration-ready by D10 on every session start.

---

## Source

- `https://wellarchitected.github.com/library/architecture/recommendations/expanding-enterprise-custom-agents-context/`
- Snapshot: `src/web/dependencies/snapshots/expanding-enterprise-custom-agents-context-2026-04-19.md` (populated by `make graphql-web` on 2026-04-19).
- `src/web/enterprise/README.md`
- `src/web/prompt-evals/decisions/D10-knowledge-layout.eval.md`
- `src/web/dependencies/manifest.yaml`
