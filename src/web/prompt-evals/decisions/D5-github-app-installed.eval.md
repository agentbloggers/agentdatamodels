---
name: D5 — Claude Code GitHub App installed at agentbloggers org
decision: "/install-github-app completed against the agentbloggers org; CLAUDE_CODE_OAUTH_TOKEN is readable as an org-level secret by Actions workflows"
wa_provenance:
  - https://wellarchitected.github.com/library/architecture/recommendations/implementing-polyrepo-engineering/  # orchestrator/executor GitHub App with least-privilege perms
  - https://wellarchitected.github.com/library/scenarios/nist-ssdf-implementation/  # PS.1 CODEOWNERS + app-mediated access
scope: both
timeout: 60
---

# Check

1. Use the GitHub MCP server (already configured, scoped to
   `agentbloggers/agentdatamodels`) to call `mcp__github__get_me`
   — verifies MCP plumbing is reachable before we probe the org.
2. Call `mcp__github__search_repositories` with query
   `org:agentbloggers` and confirm the scope matches what the
   system prompt advertises.
3. Verify the plan's auth contract is stated in the repo:
   `grep -l 'CLAUDE_CODE_OAUTH_TOKEN' src/web/enterprise/README.md`
   — must return the file.

Return `{"ok": true}` when all three predicates pass. When the
MCP probe fails with an auth error, the likely cause is
`/install-github-app` hasn't run; surface that exact guidance.

# Scorer

- `mcp__github__get_me` returns a login.
- `src/web/enterprise/README.md` mentions `CLAUDE_CODE_OAUTH_TOKEN`.

# Skip condition

If the session has no GitHub MCP tools available (`mcp__github__*`
absent from the tool list), return
`{"ok": true, "reason": "github MCP not configured — eval requires it"}`.
Log the skip so the user sees the gap.
