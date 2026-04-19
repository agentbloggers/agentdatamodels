# design-principles

GitHub Well-Architected Q1 2026 — application-security/design-principles.

Five principles that shape how teams approach security across the
software development lifecycle. They are not checklists — they are
lenses for evaluating tradeoffs.

Cross-links:
- `src/web/wellarchitected/README.md` — framework overview
- `src/web/enterprise/README.md` — where several of these principles
  are operationalised
- `src/web/prompt-evals/decisions/D4-token-scope.eval.md`

---

## Design for Security

Security is not a gate at the end of the development cycle — it is a
property that must be built in from the first design decision. This means
threat-modelling during planning, applying least-privilege to every
identity and token, and treating every external input as untrusted until
validated. Security decisions made late are expensive to retrofit.

## Design for Compliance

Compliance is an emergent property of good engineering practices, not a
separate audit exercise. When you enforce commit signing, require PR
reviews, mandate status checks, and stream audit logs, you produce the
evidence that a compliance audit needs without extra work. The D-eval
framework in this repo is designed on this principle: every session
start runs the evals, and every passing eval is an artefact of
compliance state.

## Design for Proactivity

Waiting for a vulnerability to be reported is reactive security.
Proactive security means: running CodeQL on every PR before it lands,
enabling Dependabot before the first dependency vulnerability is
discovered, configuring secret scanning push protection before a secret
is committed, and running the D-level evals before a misconfiguration
causes an incident. The cost of proactive controls is almost always
lower than the cost of reactive remediation.

## Design for Awareness

Security controls are only effective if the people and systems affected
by them understand what is happening and why. Obscure security rules
that generate noise without actionable output erode trust and get
disabled. Awareness means: clear error messages on ruleset violations,
`make doctor-web` output that names exactly which eval failed and what
to do, audit log entries that are human-readable, and D-eval skip
conditions that explain why an eval didn't run rather than silently
passing.

## Keep it Simple

Complexity is the enemy of security. Every additional credential path,
every bespoke secret-passing mechanism, every custom script that
duplicates a GitHub-native feature is attack surface and maintenance
burden. Simplicity means: one token path (OAuth, not API key and OAuth),
one standard way to install the app (`/install-github-app`), one
canonical manifest (`manifest.yaml`), one command to verify health
(`make doctor-web`). When a simpler option exists at the same capability
level, choose it.

---

## How this repo applies each principle

| Principle | Application in this repo |
|---|---|
| Design for Security | D4 (OAuth-only, no API key in repo); D8 (SHA-pinned actions, Dependabot); D9 (rulesets on `main`) |
| Design for Compliance | D7 (GHE audit log queryable via SSO-authorized PAT); D-eval frontmatter cites WA provenance, creating an auditable chain |
| Design for Proactivity | D1-D10 agent hook runs on every session start; `make graphql-web` flags drift before it becomes a vulnerability |
| Design for Awareness | Every D-eval returns `{"ok": false, "reason": "<specific predicate>"}` on failure; skip conditions explain why an eval didn't run |
| Keep it Simple | One token path: `CLAUDE_CODE_OAUTH_TOKEN` via `/install-github-app` (D4-D5); `git mv src/web/` migration requires zero restructuring (D10) |

---

## Source

- `https://wellarchitected.github.com/library/application-security/design-principles/`
- Snapshot: `src/web/dependencies/snapshots/design-principles-2026-04-19.md` (populated by `make graphql-web` on 2026-04-19).
- `src/web/prompt-evals/decisions/D4-token-scope.eval.md`
- `src/web/enterprise/README.md`
