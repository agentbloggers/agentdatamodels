---
name: D4 — auth token scope (OAuth-first, no ANTHROPIC_API_KEY in repo)
decision: |
  .claude/settings.json contains no token helper or secret.
  CLAUDE_CODE_OAUTH_TOKEN is available (env OR /login keychain).
  ANTHROPIC_API_KEY appears in NO committed file under the repo.
wa_provenance:
  - https://wellarchitected.github.com/library/application-security/recommendations/actions-security/  # #1 OIDC over long-lived creds
  - https://wellarchitected.github.com/library/scenarios/nist-ssdf-implementation/  # PS.1 OIDC instead of long-lived credentials
  - https://wellarchitected.github.com/library/application-security/design-principles/  # Keep it Simple — one token path
  - https://wellarchitected.github.com/library/scenarios/anti-patterns/  # "Neglecting Application Security Measures"
scope: both
timeout: 30
---

# Check

Three predicates, all must be true:

1. **settings.json has no token helper**:
   `python3 -c "import json,sys; d=json.load(open('.claude/settings.json')); sys.exit(0 if 'apiKeyHelper' not in d and 'otelHeadersHelper' not in d else 1)"`
2. **OAuth token reachable**:
   Either `[[ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]]` OR
   `claude config get authToken` returns a non-empty value.
3. **No ANTHROPIC_API_KEY in committed files**:
   `git grep -l ANTHROPIC_API_KEY -- ':!.claude/plans/' ':!src/web/prompt-evals/decisions/' ':!src/web/wellarchitected/' ':!src/web/enterprise/'`
   returns nothing. Intentional mentions inside the eval/WA/plan
   bodies (where we document the anti-pattern) are exempt via the
   pathspec excludes.

Return `{"ok": true}` when all three pass. On any failure, name
the specific predicate.

# Scorer

- All three predicates above pass.

# Skip condition

If the session isn't authenticated at all (no OAuth, no API key),
return `{"ok": false, "reason": "unauthenticated — run /install-github-app then /web-setup, or /login locally"}`.
This isn't a skip — the user needs to see the call to action.
