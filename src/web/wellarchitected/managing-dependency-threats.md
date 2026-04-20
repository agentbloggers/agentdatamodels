# managing-dependency-threats

GitHub Well-Architected Q1 2026 — managing-dependency-threats.

Defense-in-depth for software supply chain risk. Six layered defenses,
each independently valuable and cumulatively much harder to bypass.

Cross-links:
- `src/web/wellarchitected/README.md` — framework overview
- `src/web/dependencies/manifest.yaml` — our sha256 pin pattern is a
  concrete application of the "pin by immutable ref" principle
- `src/web/prompt-evals/decisions/D8-deps-pinned.eval.md` — the eval
  that enforces defenses 2 (SHA pinning) and 6 (Dependabot)

---

## Defense 1 — Disable package lifecycle scripts by default

Package lifecycle scripts (`preinstall`, `postinstall`, `prepare`) run
arbitrary code at install time — a common malware vector. In high-security
environments, disable them by default and re-enable only for packages that
require them.

`.npmrc`:
```ini
ignore-scripts=true
save-exact=true
```

`.yarnrc.yml`:
```yaml
enableScripts: false
```

For packages that legitimately need install scripts (e.g. native add-ons),
re-enable selectively in `package.json`:

```json
{
  "dependenciesMeta": {
    "esbuild": { "built": true },
    "node-canvas": { "built": true }
  }
}
```

Then run `npm rebuild <pkg>` explicitly in the CI workflow, after the
install step, for only the allow-listed packages. This makes the
script-execution surface visible and auditable.

---

## Defense 2 — Dev containers for isolation

Wrap all development and CI work in a dev container. This prevents
package scripts from accessing credentials on the host OS, limits blast
radius to the container filesystem, and gives Codespaces users an
identical environment.

`.devcontainer/devcontainer.json` minimal shape:

```json
{
  "name": "agentdatamodels",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu-24.04",
  "features": {
    "ghcr.io/devcontainers/features/node:1": { "version": "20" },
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },
  "postCreateCommand": "npm ci --ignore-scripts",
  "remoteEnv": {
    "GH_TOKEN": "${localEnv:GH_TOKEN}"
  }
}
```

Key points:
- `npm ci --ignore-scripts` is the correct install command inside the
  container (pairs with `.npmrc ignore-scripts=true`).
- `remoteEnv` passes only the tokens that the container actually needs.
- Never mount `~/.ssh` or `~/.gitconfig` into the container if a PAT
  is sufficient.

---

## Defense 3 — Require signed commits with user interaction

Signed commits prove that a commit was authored by a human who holds the
signing key — not an automated process that compromised a token.

Configure GPG or SSH signing:

```bash
git config --global commit.gpgsign true
git config --global user.signingkey <KEY_ID>
```

Or SSH signing (simpler, recommended):

```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
```

Enforce at the repo level via a repository ruleset with
`required_signatures: true`. This is the PS.1 / D9 control:
see `src/web/prompt-evals/decisions/D9-rulesets-enforced.eval.md`.

Note: signed commits require user interaction (passphrase or Touch ID).
Automation-only commits (bots, Actions) must use a separate signing key
whose private key is stored as an Actions secret, not in a `.env` file.

---

## Defense 4 — Enforce repository rulesets

Repository rulesets (GA on GitHub Enterprise and public repos) enforce
the other defenses at the platform level — even admins cannot bypass
active rulesets without an audit trail.

Key rules to enable on `main` (these map directly to D9):

| Rule type | What it prevents |
|---|---|
| `required_signatures` | Unsigned commits merging |
| `pull_request` | Direct pushes; enforces CODEOWNERS review |
| `required_status_checks` | Merging when Dependabot or CodeQL fails |
| `required_linear_history` | Force-merge of untested branches |
| `non_fast_forward` | Force-push rewriting history |

Rulesets apply to everyone including admins when set to
`enforcement: active`. The audit trail for bypass events is queryable via
`organization.auditLog` — the RV.1 surface (D7).

---

## Defense 5 — Establish trusted publishing and verification

Attestations bind a published artifact to the exact workflow run that
produced it. Consumers can verify the provenance before installing.

**Publishing with provenance:**

```bash
# in CI workflow
npm publish --provenance
```

This requires the workflow to have `id-token: write` permission so
GitHub can issue an OIDC token to Sigstore.

**Generating attestations for non-npm artifacts:**

```yaml
- uses: actions/attest@<sha>        # general artifact attestation
  with:
    subject-path: dist/my-artifact
    predicate-type: https://slsa.dev/provenance/v1

- uses: actions/attest-sbom@<sha>   # SPDX SBOM attestation
  with:
    subject-path: dist/my-artifact
    sbom-format: spdx-json
```

**Verifying at install time:**

```bash
npm audit signatures
gh attestation verify dist/my-artifact \
  --owner agentbloggers
```

The `npm audit signatures` command checks that every installed package in
`node_modules` has a valid registry signature. Run this in CI after
`npm ci` to catch tampered packages.

---

## Defense 6 — Monitor and respond continuously

Continuous monitoring means Dependabot alerts, automated PR triage, and
the dependency review action on every PR that changes lock files.

**Dependabot config (`.github/dependabot.yml`):**

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      actions:
        patterns: ["*"]
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

D8 requires `package-ecosystem: github-actions` as a minimum. The `npm`
ecosystem entry is bonus but recommended once `package.json` is present.

**Auto-triage pattern:** Label Dependabot PRs automatically with a
`dependabot` label, assign to the security team, and auto-merge patch
updates when CI passes:

```yaml
# .github/workflows/dependabot-auto-merge.yml
on:
  pull_request:
    types: [opened, reopened]
jobs:
  auto-merge:
    if: github.actor == 'dependabot[bot]'
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: write
    steps:
      - uses: actions/github-script@<sha>   # D8: pin by SHA
        with:
          script: |
            const pr = context.payload.pull_request;
            if (pr.title.startsWith('Bump') && pr.labels.find(l => l.name === 'dependencies')) {
              await github.rest.pulls.merge({ ...context.repo, pull_number: pr.number });
            }
```

**Dependency review action** on PRs touching `package-lock.json` or
`yarn.lock`:

```yaml
- uses: actions/dependency-review-action@<sha>
  with:
    fail-on-severity: high
    license-check: true
    allow-licenses: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC
```

---

## How our manifest.yaml applies "pin by immutable ref"

Every `pin:` entry in `src/web/dependencies/manifest.yaml` is either a
full version tag (e.g. `v2.1.114`) or `latest` (for watch-only repos
that don't have a pinned consumer). The `sha256:` field on each `pages:`
entry is the immutable-ref equivalent for documentation snapshots.

When `make graphql-web` detects that a watched repo's latest tag differs
from its `pin:` value, it flags drift — the same intent as Dependabot
alerts for code dependencies. This is the "monitor and respond
continuously" defense applied to our knowledge-base dependencies.

---

## Source

- `https://wellarchitected.github.com/library/application-security/recommendations/managing-dependency-threats/`
- Snapshot: `src/web/dependencies/snapshots/managing-dependency-threats-2026-04-19.md` (populated by `make graphql-web` on 2026-04-19).
- `src/web/dependencies/manifest.yaml`
- `src/web/prompt-evals/decisions/D8-deps-pinned.eval.md`
- `src/web/wellarchitected/actions-security.md` (defenses 2, 5 overlap)
