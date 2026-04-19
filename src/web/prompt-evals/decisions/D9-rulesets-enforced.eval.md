---
name: D9 — repository rulesets enforced on agentbloggers/agentdatamodels:main
decision: |
  main has an active ruleset enforcing: required reviews from CODEOWNERS,
  required status checks (lint-web + test-web + graphql-web), linear history,
  commit signing, no force pushes.
wa_provenance:
  - https://wellarchitected.github.com/library/scenarios/nist-ssdf-implementation/  # PO.4 rulesets with status checks; PS.1 rulesets/CODEOWNERS/commit signing; PW.7 PR review rules
  - https://wellarchitected.github.com/library/architecture/recommendations/implementing-polyrepo-engineering/  # "Protect branches with rulesets"
scope: both
timeout: 60
---

# Check

Read the repo's rulesets via GitHub MCP / `gh api`:

```bash
gh api /repos/agentbloggers/agentdatamodels/rulesets --jq '
  .[] | select(.enforcement == "active") |
  {name: .name, target: .target, refs: .conditions.ref_name.include}
'
```

Assert at least one active ruleset targets `main` with rules
covering these five categories (rule `type` values):
- `pull_request` (required reviews from CODEOWNERS).
- `required_status_checks` (include `lint-web`, `test-web`,
  `graphql-web`).
- `required_linear_history`.
- `required_signatures`.
- `non_fast_forward` (blocks force-push).

Return `{"ok": true}` when all five rule types are present on a
main-targeting active ruleset. On failure, name the missing
rule type(s).

# Scorer

- Active ruleset count on `main` ≥ 1.
- Every rule type in the checklist is present on that ruleset.

# Skip condition

If GH_TOKEN lacks `admin:repo` / `read:repo_ruleset` scope, return
`{"ok": true, "reason": "GH_TOKEN lacks repo-admin scope — ruleset read not permitted"}`.
Don't block session start on missing admin scope; surface it as a
gap for the user.
