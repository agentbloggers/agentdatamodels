---
name: D6 — /web-setup token still valid in cloud
decision: "In a cloud session, the gh CLI auth synced by /web-setup is still valid (not expired, not revoked)"
wa_provenance:
  - https://wellarchitected.github.com/library/scenarios/nist-ssdf-implementation/  # PS.1 MFA + SSO
  - https://wellarchitected.github.com/library/architecture/recommendations/expanding-enterprise-custom-agents-context/  # PAT with repo scope for MCP-consumer agents
scope: cloud
timeout: 30
---

# Check

1. `gh auth status` exits 0.
2. `gh api /user` returns a non-null `login` field.

Return `{"ok": true, "reason": "web-setup token valid"}` on both
passing. On failure, surface the remediation:
"Run `/web-setup` in this cloud env to refresh the synced gh
token from your local machine."

# Scorer

- `gh auth status` exit 0.
- `gh api /user | jq -r .login` returns a non-null string.

# Skip condition

If `$CLAUDE_CODE_REMOTE != "true"`, return
`{"ok": true, "reason": "local session — /web-setup not applicable"}`.
This eval is cloud-only; local sessions use `gh auth login`
which has its own failure paths covered by D4.
