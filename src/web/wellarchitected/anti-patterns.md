# anti-patterns

GitHub Well-Architected Q1 2026 — anti-patterns.

13 anti-patterns across 7 categories. For each, the D-level decision
that prevents it is named where one exists.

Cross-links:
- `src/web/wellarchitected/README.md` — framework overview
- `src/web/wellarchitected/design-principles.md` — root causes that
  make anti-patterns tempting
- `src/web/enterprise/README.md`

---

## Platform

### Fragmented Organization Structure

Spreading repositories across multiple GitHub organisations without a
governance model creates visibility gaps: security alerts, audit logs,
and Projects boards do not span org boundaries by default. Code owners
defined in one org cannot be required reviewers in another. GHAS
licenses do not transfer automatically.

**Prevention in this repo:** All repos target the `agentbloggers` org.
The `agentbloggers` enterprise subscription provides cross-org visibility
via `enterprise(slug:…)` GraphQL queries (see
`src/web/enterprise/README.md`). No repos will be created outside this
org without explicit integration-layer planning.

D-eval that catches drift: D7 (GHE audit log reachable) — if the org
structure fragments, `organization(login: "agentbloggers")` queries
start returning scope errors.

---

## Planning

### Vague Requirements

Requirements stated as "improve security" or "add CI" without measurable
acceptance criteria cannot be evaluated, cannot be assigned a status-check,
and cannot be closed with confidence. Vague requirements also make it
impossible to know when you are done, leading to scope creep and
never-shipped features.

**Prevention in this repo:** Every D-level decision has a concrete
machine-checkable predicate (a bash snippet or Python one-liner). A
requirement without a testable assertion belongs in a plan file, not a
D-eval.

D-eval anchor: none directly — but the eval format (check + scorer +
skip condition) enforces specificity at the requirements level.

### Ineffective Work Management

Tracking work in ad-hoc places (Slack threads, email, sticky notes)
rather than GitHub Issues means there is no canonical record of why a
decision was made, no linkage between a PR and the issue it closes, and
no way to query work state programmatically.

**Prevention in this repo:** All planned work lives in GitHub Issues or
the plan files under `.claude/plans/`. The change-set pattern
(`CHG-XXXX`) will link issues in sibling repos back to a single tracking
issue in the integration repo.

D-eval anchor: TODO — a D11 eval for change-set hygiene is planned once
the `CHG-XXXX` scheme is introduced.

---

## Development

### Poor Commit Practices

Commits that bundle unrelated changes, use non-descriptive messages
("fix stuff", "WIP"), or bypass signing make the history unreviewable.
Unsigned commits allow impersonation — anyone with push access can
attribute a commit to any email address.

**Prevention in this repo:** `required_signatures` rule in the D9
ruleset blocks unsigned commits on `main`. Commit message conventions
follow the `chore:` / `feat:` / `fix:` prefix pattern from the plan.

D-eval anchor: D9 (required_signatures in ruleset).

### Inconsistent Branching Strategy

Teams that use different branch naming schemes in different repos make
cross-repo automation brittle. A Routine that opens PRs on `feature/*`
branches in one repo and `claude/*` in another cannot use the same
filter logic.

**Prevention in this repo:** All Claude-authored branches use the
`claude/*` prefix (Routines convention). Change-set branches will use
`changeset/CHG-XXXX/<slug>` across all repos. Both patterns are
documented in `src/web/wellarchitected/polyrepo-changesets.md`.

D-eval anchor: none yet — branch naming is checked informally via
`git branch --list 'claude/*'`.

### Accumulating Technical Debt

Deferring small quality improvements indefinitely creates a codebase
where change becomes risky. In the CI/CD surface, the most common form
is: workflows that are never refactored, test steps that are commented
out "temporarily", and lint rules that are disabled because "we'll fix
it later."

**Prevention in this repo:** Every `make *-web` target is idempotent.
The `make lint-web` target runs on every session start via the D-eval
hook. Disabled or skipped checks are flagged as explicit TODO items, not
silently bypassed.

D-eval anchor: D1 (drift detection on `make graphql-web`).

### Overengineering

Building complex multi-stage pipelines, custom orchestration layers, or
bespoke secret management systems when a simpler GitHub-native primitive
would do creates maintenance burden without security benefit. The
orchestrator/executor pattern is an example of right-complexity: it is
the minimum structure needed to separate concerns, not the maximum.

**Prevention in this repo:** The `Keep it Simple` design principle
(see `src/web/wellarchitected/design-principles.md`) is the explicit
counter-pressure. New abstractions require a `wa_provenance:` citation
in their D-eval — speculation is not a valid provenance source.

D-eval anchor: D4 (one token path — `CLAUDE_CODE_OAUTH_TOKEN` — prevents
the anti-pattern of parallel auth mechanisms).

---

## Collaboration

### Bypassing Code Reviews

Direct pushes to `main` that skip required reviews defeat CODEOWNERS and
allow changes that were not reviewed to reach production. Even with good
intentions, bypass creates a precedent and an audit gap.

**Prevention in this repo:** The `non_fast_forward` + `pull_request`
rules in the D9 ruleset prevent direct pushes and bypass. Enforcement is
`active`, not `evaluate` — admins cannot bypass without a logged override.

D-eval anchor: D9 (pull_request + non_fast_forward rules).

### Delayed Feedback Cycles

CI that takes 20+ minutes, code review that waits 3 days, and security
alerts that go unacknowledged for weeks all lengthen the feedback loop.
Long feedback loops make it economically rational to bundle many changes
into one PR — which makes review harder — creating a vicious cycle.

**Prevention in this repo:** The three required status checks
(`lint-web`, `test-web`, `graphql-web`) are designed to run in under
60 seconds each. D8 (Dependabot) ensures dependency PRs arrive weekly,
not in a backlogged batch.

D-eval anchor: D9 (status checks required before merge).

---

## Continuous Integration

### Insufficient Test Automation

Manual testing before every merge is not scalable and is error-prone.
The absence of automated tests means the `required_status_checks` rule
has nothing to require — the gate exists on paper but enforces nothing.

**Prevention in this repo:** `make test-web` is a required status check
(D9). The current test is a smoke test (serve `index.html` + fetch it).
More meaningful tests are added as new surfaces are built.

D-eval anchor: D9 (test-web in required_status_checks).

### Neglecting Application Security Measures

This is the umbrella anti-pattern: not enabling secret scanning,
not configuring Dependabot, not requiring signed commits, not setting up
OIDC — each omission is individually low-cost to fix and collectively
high-cost to exploit.

**Prevention in this repo:** This anti-pattern maps directly to D4
(token scope), D5 (GitHub App), D6 (web-setup token), D7 (SSO
authorization), and D8 (deps pinned). The D-eval hook runs all of
these on every session start. The WA provenance for D4 explicitly cites
the anti-patterns page: any session where `ANTHROPIC_API_KEY` appears
in a committed file is a direct instance of this anti-pattern.

D-eval anchor: D4, D5, D6, D7, D8 (composite).

---

## Continuous Deployment

### Large Releases

Bundling many changes into an infrequent release increases the blast
radius of a failed deployment and makes rollbacks difficult. Each
release that is too large to reason about is also too large to test
adequately.

**Prevention in this repo:** The change-set pattern (`CHG-XXXX`) scopes
each change to the minimum set of repos affected. When we introduce
system release tags (`system-2026.01.30`), the `components.lock` diff
between tags provides the "what changed" surface for the release.

D-eval anchor: TODO — D11 (change-set hygiene) when the scheme lands.

### Manual Deployment Processes

Manual steps in a deployment process are undocumented, unrepeatable, and
audit-unfriendly. Every step that requires a human to remember a command
is a step that will eventually be skipped under time pressure.

**Prevention in this repo:** Every target in `Makefile` is idempotent
and machine-runnable. The move to reusable workflows
(`src/web/wellarchitected/polyrepo-engineering.md` Step 4) will replace
the last manual steps with versioned, auditable Actions runs.

D-eval anchor: D8 (Dependabot + SHA pinning enforces that CI
deployments use pinned, reproducible inputs).

---

## Application Security

### Detecting PII with Secret Scanning Custom Patterns

GitHub's secret scanning can be extended with custom patterns using
regular expressions to detect PII (Personal Identifiable Information)
such as SSNs, credit card numbers, or internal tokens. Relying solely on
the default secret scanning ruleset means PII specific to your domain
goes undetected.

**Prevention in this repo:** GHAS secret scanning with custom patterns
is not yet configured. When configured, custom patterns for our token
formats (`CLAUDE_CODE_OAUTH_TOKEN` prefix, Neon API key shape,
Cloudflare API token shape) will be added via the GHAS org settings.
This is part of the security-campaign-automation phase
(`src/web/wellarchitected/polyrepo-engineering.md` Step 6).

D-eval anchor: TODO — no D-eval yet. The security-campaign phase
(Step 6) is not started.

---

## Source

- `https://wellarchitected.github.com/library/scenarios/anti-patterns/`
- Snapshot: `src/web/dependencies/snapshots/anti-patterns-2026-04-19.md` (populated by `make graphql-web` on 2026-04-19).
- `src/web/prompt-evals/decisions/D4-token-scope.eval.md`
- `src/web/prompt-evals/decisions/D8-deps-pinned.eval.md`
- `src/web/prompt-evals/decisions/D9-rulesets-enforced.eval.md`
- `src/web/wellarchitected/design-principles.md`
