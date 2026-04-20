# nist-ssdf-implementation

GitHub Well-Architected Q1 2026 — nist-ssdf-implementation.

The NIST Secure Software Development Framework (SSDF, NIST SP 800-218)
organises secure software development into four practice groups. This
page maps each sub-practice to the GitHub features and artifacts we use,
and anchors each to the relevant D-level eval.

Cross-links:
- `src/web/wellarchitected/README.md` — framework overview
- `src/web/wellarchitected/actions-security.md` — PW.4 / PW.6 detail
- `src/web/enterprise/README.md` — SSO / PAT / audit-log context
- `src/web/dependencies/manifest.yaml`

---

## PO — Prepare the Organisation

Practices that establish organisational readiness: policies, criteria,
toolchains, and secure environments.

### PO.4 — Define and use criteria for checking software security

Criteria means: the conditions under which a piece of software may be
merged, deployed, or released. GitHub enforces criteria via repository
rulesets and required status checks.

| Practice | GitHub feature | Artifact | D-eval |
|---|---|---|---|
| Define merge criteria | Repository rulesets | `active` ruleset on `main` | D9 |
| Enforce status checks | Required status checks rule | `lint-web`, `test-web`, `graphql-web` | D9 |
| Require code review | `pull_request` rule (CODEOWNERS) | `CODEOWNERS` file | D9 |
| Block force-push | `non_fast_forward` rule | Ruleset enforcement | D9 |
| Require linear history | `required_linear_history` rule | Ruleset enforcement | D9 |

D9 (`src/web/prompt-evals/decisions/D9-rulesets-enforced.eval.md`)
asserts all five rule types are present on an active ruleset targeting
`main`.

### PO.5 — Implement and maintain secure environments for software development

Secure environments isolate credentials, apply least-privilege, and use
short-lived tokens rather than long-lived secrets.

| Practice | GitHub feature | Artifact | D-eval |
|---|---|---|---|
| Short-lived credentials | OIDC token exchange | `id-token: write` permission | D4 |
| Environment isolation | GitHub Environments | `copilot` environment | D4 |
| Least-privilege runners | `permissions: {}` at workflow level | Actions workflow | D4 |
| OAuth over API key | `CLAUDE_CODE_OAUTH_TOKEN` | Org-level secret | D4 |

D4 (`src/web/prompt-evals/decisions/D4-token-scope.eval.md`) validates
that `ANTHROPIC_API_KEY` is absent from committed files and that an OAuth
token is present.

---

## PS — Protect the Software

Practices that protect software artefacts and the supply chain from
unauthorised modification.

### PS.1 — Protect all forms of code from unauthorised access and tampering

| Practice | GitHub feature | Artifact | D-eval |
|---|---|---|---|
| SAML/OIDC SSO enforcement | GHE SAML SSO | Org SSO policy | D7 |
| MFA enforcement | GHE org policy | Admin panel setting | D7 |
| Repository access control | Branch protection + rulesets | Ruleset on `main` | D9 |
| CODEOWNERS-based review | `pull_request` rule | `CODEOWNERS` file | D9 |
| Commit signing | `required_signatures` rule | GPG / SSH signing | D9 |
| PAT SSO authorization | SSO-authorized PAT | `GH_TOKEN` | D7 |

D7 (`src/web/prompt-evals/decisions/D7-ghe-sso-authorized.eval.md`)
verifies the PAT is SSO-authorized against the `agentbloggers` SAML
provider by querying the GHE audit log.

### PS.2 — Provide a mechanism for verifying the integrity of the software release

Artifact attestations bind a release to the exact CI run that produced it,
enabling consumers to verify provenance before installation.

| Practice | GitHub feature | Artifact | D-eval |
|---|---|---|---|
| Build provenance | `actions/attest` | Sigstore attestation bundle | D8 |
| SBOM generation | `actions/attest-sbom` | SPDX-format SBOM | D8 (future) |
| Registry signature check | `npm audit signatures` | CI step output | D8 |
| Workflow provenance | `npm publish --provenance` | npm provenance record | D8 (future) |
| Consumer verification | `gh attestation verify` | CLI command | D8 |

D8 (`src/web/prompt-evals/decisions/D8-deps-pinned.eval.md`) currently
focuses on SHA pinning and Dependabot. Attestation generation is flagged
as future work below.

### PS.3 — Archive and protect each software release

Tag protection, immutable releases, and SBOM archiving ensure that a
released version cannot be silently modified after the fact.

| Practice | GitHub feature | Artifact | D-eval |
|---|---|---|---|
| Immutable release tags | Tag protection ruleset | `tag_name_pattern: v*` rule | TODO |
| GitHub Releases | Release asset checksums | `gh release create` | TODO |
| SBOM archiving | SPDX SBOM in release assets | `actions/attest-sbom` | TODO |

**Flag: PS.3 is future work.** No version tags or GitHub Releases exist
yet in this repo. This sub-practice activates when Step 5 of the polyrepo
plan lands (release governance). See
`src/web/wellarchitected/polyrepo-engineering.md` Step 5.

---

## PW — Produce Well-Secured Software

Practices applied during development: dependency management, secure
coding, and code review.

### PW.4 — Reuse existing, well-secured software when feasible

Reusing well-secured software means preferring maintained ecosystem
packages over home-grown equivalents, and verifying those packages
haven't been tampered with.

| Practice | GitHub feature | Artifact | D-eval |
|---|---|---|---|
| Actions supply chain | Pinned `uses:` by SHA | `.github/workflows/*.yml` | D8 |
| OIDC for cloud auth | `id-token: write` + OIDC provider | Workflow permissions | D4 |
| Dependabot updates | `dependabot.yml` | Automated PRs | D8 |
| Dependency review | `dependency-review-action` | PR check | D8 (future) |
| License compliance | `dependency-review-action` license check | PR check | D8 (future) |

See `src/web/wellarchitected/managing-dependency-threats.md` Defense 6
for the full `dependabot.yml` config and the dependency-review action
snippet.

### PW.6 — Configure the compilation, interpreter, and build processes to improve executable security

For our GitHub Actions surface, PW.6 maps to using hardened,
known-good execution environments: GitHub-hosted runners with a
fixed OS version, pinned action versions, and no self-hosted runners
on public repos.

| Practice | GitHub feature | Artifact | D-eval |
|---|---|---|---|
| Pinned action versions | SHA-pinned `uses:` lines | `.github/workflows/*.yml` | D8 |
| Managed runners | `runs-on: ubuntu-latest` (GitHub-hosted) | Workflow `jobs.<id>` | D8 |
| No self-hosted on public | Policy at org level | Actions settings | D8 |

See `src/web/wellarchitected/actions-security.md` practices 2 and 10
for rationale and code examples.

### PW.7 — Review and/or analyse human-readable code to identify vulnerabilities

Code review is automated where possible (CodeQL, Copilot code review)
and enforced where needed (CODEOWNERS required review on `main`).

| Practice | GitHub feature | Artifact | D-eval |
|---|---|---|---|
| PR required | `pull_request` ruleset rule | Active ruleset | D9 |
| Code owner review | CODEOWNERS + dismissal | `CODEOWNERS` file | D9 |
| CodeQL scanning | `codeql-analysis.yml` | Code scanning alerts | TODO |
| Copilot code review | Copilot-enabled review | PR review bot | TODO |
| Signed commits on merge | `required_signatures` | Ruleset rule | D9 |

D9 covers the first three PW.7 controls. CodeQL and Copilot code review
are future work (no `codeql-analysis.yml` exists yet).

---

## RV — Respond to Vulnerabilities

Practices for identifying, assessing, and remediating vulnerabilities in
released software.

### RV.1 — Identify and confirm vulnerabilities on an ongoing basis

Continuous identification requires: monitoring the GHAS security
overview, streaming audit logs to a SIEM, and using webhooks to
trigger automated response.

| Practice | GitHub feature | Artifact | D-eval |
|---|---|---|---|
| Security overview | GHAS org security overview | Dashboard | D7 |
| Audit log streaming | `organization.auditLog` GraphQL | `make graphql-web` | D7 |
| Dependabot alerts | Dependabot vulnerability database | `.github/dependabot.yml` | D8 |
| Secret scanning | Push protection + alerts | Org secret scanning policy | TODO |
| Webhook response | `security_advisory` webhook | TODO | TODO |

D7 (`src/web/prompt-evals/decisions/D7-ghe-sso-authorized.eval.md`)
validates that the PAT can reach `organization.auditLog`, which is the
primary RV.1 monitoring surface. The query used in D7:

```graphql
query {
  organization(login: "agentbloggers") {
    auditLog(first: 1) {
      nodes {
        ... on AuditEntry { action createdAt actor { login } }
      }
    }
  }
}
```

This requires the PAT to have `admin:org` or `read:audit_log` scope and
to be SSO-authorized. Audit log streaming to a SIEM (e.g., Splunk,
Datadog) is future work once the volume justifies it.

---

## Summary: D-eval to SSDF mapping

| D-eval | SSDF sub-practices |
|---|---|
| D4 (token scope) | PO.5 (environments + OIDC), PS.1 (OIDC over long-lived creds) |
| D7 (GHE SSO) | PS.1 (SAML/OIDC SSO), RV.1 (audit log) |
| D8 (deps pinned) | PS.2 (attestations), PW.4 (Actions policies, Dependabot), PW.6 (pinned runners) |
| D9 (rulesets) | PO.4 (status checks), PS.1 (rulesets/CODEOWNERS/signing), PW.7 (PR review) |

---

## Source

- `https://wellarchitected.github.com/library/scenarios/nist-ssdf-implementation/`
- Snapshot: `src/web/dependencies/snapshots/nist-ssdf-implementation-2026-04-19.md` (populated by `make graphql-web` on 2026-04-19).
- `src/web/prompt-evals/decisions/D4-token-scope.eval.md`
- `src/web/prompt-evals/decisions/D7-ghe-sso-authorized.eval.md`
- `src/web/prompt-evals/decisions/D8-deps-pinned.eval.md`
- `src/web/prompt-evals/decisions/D9-rulesets-enforced.eval.md`
- `src/web/enterprise/README.md`
