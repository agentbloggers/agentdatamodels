---
name: D7 — GH_TOKEN is SSO-authorized against the agentbloggers GHE org
decision: "The PAT used as GH_TOKEN has been SSO-authorized, so GHE-only GraphQL roots (organization.auditLog, repositoryRulesets) are reachable"
wa_provenance:
  - https://wellarchitected.github.com/library/scenarios/nist-ssdf-implementation/  # RV.1 audit-log streaming to SIEM; PS.1 SAML/OIDC SSO
scope: both
timeout: 60
---

# Check

Run the canonical SSO-gated GHE query via `gh`:

```bash
gh api graphql -f query='
  query {
    organization(login: "agentbloggers") {
      auditLog(first: 1) {
        nodes {
          ... on AuditEntry { action createdAt actor { login } }
        }
      }
    }
  }
'
```

Capture stderr and stdout. Pass when:
- HTTP 200 (no `gh: Resource not accessible by personal access token` error).
- Response contains no `"message":"SAML SSO enforcement"` string.
- `.data.organization.auditLog` is present (may be empty list — that's fine).

# Scorer

- Exit 0.
- Response body does not contain `"SAML SSO"`, `"Resource not accessible"`,
  or `"not authorized"`.

# Skip condition

The audit log requires `admin:org` or `read:audit_log` scope on the
PAT. If `gh auth status` reports neither scope, return
`{"ok": true, "reason": "GH_TOKEN lacks admin:org/read:audit_log — eval skipped; set DOCTOR_INCLUDE_GHE=1 with an admin PAT to run"}`.
Log the skip reason so the user knows this eval never ran.
