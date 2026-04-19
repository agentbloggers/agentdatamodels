# actions-security

GitHub Well-Architected Q1 2026 — actions-security.

14 practices for hardening GitHub Actions workflows. Every practice
below is verbatim from the WA recommendation. Concrete code snippets
are provided where the WA recommendation supplies them or where the
pattern is unambiguous.

Cross-links:
- `src/web/wellarchitected/README.md` — framework overview
- `src/web/wellarchitected/managing-dependency-threats.md` — supply
  chain defenses (overlaps practices 2, 5, 6)
- `src/web/prompt-evals/decisions/D4-token-scope.eval.md` — practice 1
- `src/web/prompt-evals/decisions/D8-deps-pinned.eval.md` — practice 2
- `src/web/dependencies/manifest.yaml`

---

## Practice 1 — Use OIDC instead of long-lived credentials

Long-lived credentials stored as Actions secrets are a persistent
exfiltration target. OIDC tokens are short-lived and scoped to a single
workflow run.

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@<sha>  # Practice 2: pin by SHA
    with:
      role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
      aws-region: us-east-1
```

For the Claude Code GitHub App: the app's installation token is the
OIDC-equivalent for Anthropic auth. Consume it via
`secrets.CLAUDE_CODE_OAUTH_TOKEN`, never via `ANTHROPIC_API_KEY` in
the workflow. See D4.

---

## Practice 2 — Pin Actions to commit SHAs

Mutable tags (`@v1`, `@main`) can be overwritten to point to malicious
code. Pin by the full 40-character commit SHA and annotate the tag for
human readability.

```yaml
# Good — SHA pin with version comment
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2

# Bad — mutable tag
- uses: actions/checkout@v4
```

D8 (`src/web/prompt-evals/decisions/D8-deps-pinned.eval.md`) enforces
this: every `uses:` line that is not a local action (`./…`) must
reference a 40-hex SHA.

---

## Practice 3 — Least-privilege permissions at job level, not workflow

Set `permissions:` on each individual job, not at the top-level
`on:` / workflow scope. This way, jobs that only need read access do not
inherit write access from sibling jobs.

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    permissions:
      contents: read       # just enough to checkout

  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write      # only this job needs write
      id-token: write
```

---

## Practice 4 — Remove workflow-level GITHUB_TOKEN permissions

The workflow-level `permissions:` block defaults to broad access on
older repos. Explicitly deny all at the workflow level and grant only
what each job needs.

```yaml
# Top of workflow file
permissions: {}   # deny-all; each job declares its own

jobs:
  build:
    permissions:
      contents: read
```

This is the pattern used in `src/web/enterprise/README.md` for the
Claude Code Action consumer.

---

## Practice 5 — Dependabot for supply-chain protection

Dependabot opens automated PRs when pinned action SHAs fall behind. This
is the update path for Practice 2 pins — without Dependabot, SHA pins
rot and eventually become security liabilities.

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      actions:
        patterns: ["*"]
```

D8 requires this file to exist and declare `package-ecosystem: github-actions`.

---

## Practice 6 — Avoid mutable dependencies

Beyond action SHAs, mutable references include:
- Unpinned container images (`ubuntu:latest`, `node:20`)
- Composite actions calling `@main` of external repos
- External scripts fetched via `curl | bash`

```yaml
# Bad — mutable container
container:
  image: node:20

# Good — pinned by digest
container:
  image: node@sha256:<digest>

# Bad — external script
- run: curl https://example.com/setup.sh | bash

# Good — copy the script into the repo and pin it
- run: ./.github/scripts/setup.sh
```

---

## Practice 7 — Prevent workflow injection

Expression values from untrusted inputs (PR title, issue body, branch
name) can inject shell commands when interpolated directly in `run:`.

```yaml
# Bad — injection risk
- run: echo "Title: ${{ github.event.pull_request.title }}"

# Good — pass through env var
- name: Log PR title
  env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  run: echo "Title: $PR_TITLE"
```

The shell expands `$PR_TITLE` as a value, not as a command substitution.
This eliminates the injection surface for most cases.

---

## Practice 8 — Restrict `pull_request_target`

`pull_request_target` runs in the context of the base repo (with access
to secrets) but the triggering code comes from a fork. Never checkout
the fork's code in a `pull_request_target` workflow.

```yaml
# Bad — checks out fork code with base-repo secrets available
on: pull_request_target
jobs:
  test:
    steps:
      - uses: actions/checkout@<sha>
        with:
          ref: ${{ github.event.pull_request.head.sha }}   # fork code

# Good — only use pull_request_target for metadata operations
on: pull_request_target
jobs:
  label:
    steps:
      - uses: actions/github-script@<sha>
        with:
          script: github.rest.issues.addLabels(...)        # no code checkout
```

---

## Practice 9 — Secure `workflow_run`

`workflow_run` triggers with write access to the base repo regardless of
the triggering event's origin. Apply a branch filter, verify the
triggering event type, treat downloaded artifacts as untrusted, and write
all artifacts to `$RUNNER_TEMP` (not `$GITHUB_WORKSPACE`).

```yaml
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main, release/**]   # branch filter

jobs:
  upload:
    if: github.event.workflow_run.conclusion == 'success' &&
        github.event.workflow_run.event == 'pull_request'
    steps:
      - uses: actions/download-artifact@<sha>
        with:
          run-id: ${{ github.event.workflow_run.id }}
          path: ${{ runner.temp }}/artifacts   # RUNNER_TEMP, not workspace
      # Treat artifacts as untrusted — scan/validate before use
```

---

## Practice 10 — Avoid self-hosted runners on public repos

Self-hosted runners on public repositories can be targeted by malicious
PRs from anonymous contributors. The attack: fork the repo, open a PR
with a workflow that reads runner environment variables or the local
filesystem.

Use GitHub-hosted runners for all public repo workflows. Reserve
self-hosted runners for private repos where fork PRs are disabled.

If a self-hosted runner is required, isolate it in a network segment
with no access to production credentials.

---

## Practice 11 — Restrict allowed actions at enterprise/org policy level

Enterprise and org admins can limit which actions are allowed:

- **GitHub-owned actions only** — most restrictive
- **GitHub-owned + Marketplace verified** — balanced
- **Allow-list by owner** — custom control

Set this at the org level in GitHub Settings > Actions > General. Actions
outside the policy are blocked at job start, not at queue time.

---

## Practice 12 — Configure repository rulesets

Repository rulesets enforce code quality and security gates that
prevent unsafe merges. Key rules for `main` (fully covered by D9):

```
pull_request:          required reviews from CODEOWNERS
required_status_checks: lint-web, test-web, graphql-web
required_linear_history
required_signatures
non_fast_forward
```

See D9 (`src/web/prompt-evals/decisions/D9-rulesets-enforced.eval.md`)
for the complete ruleset assertion.

---

## Practice 13 — Use immutable OIDC claims

When building OIDC trust policies for cloud providers (AWS, GCP, Azure),
use claims that cannot be spoofed by a repository rename or org transfer.

```
# Bad — mutable (org/repo rename changes this)
repository == "agentbloggers/agentdatamodels"

# Good — immutable numeric ID
repository_owner_id == "12345678"
repository_id == "87654321"
```

The `repository_owner_id` and `repository_id` claims are numeric GitHub
IDs that remain stable through renames.

---

## Practice 14 — Use `head.sha` over `head.ref`

When checking out code within a `workflow_run` or `pull_request_target`
context, reference the commit SHA rather than the branch name. Branch
names are mutable; SHAs are not.

```yaml
- uses: actions/checkout@<sha>
  with:
    ref: ${{ github.event.workflow_run.head_sha }}   # immutable
    # NOT: ${{ github.event.workflow_run.head_branch }}  # mutable
```

---

## Source

- `https://wellarchitected.github.com/library/application-security/recommendations/actions-security/`
- Snapshot: `src/web/dependencies/snapshots/actions-security-2026-04-19.md` (populated by `make graphql-web` on 2026-04-19).
- `src/web/prompt-evals/decisions/D4-token-scope.eval.md`
- `src/web/prompt-evals/decisions/D8-deps-pinned.eval.md`
- `src/web/enterprise/README.md`
