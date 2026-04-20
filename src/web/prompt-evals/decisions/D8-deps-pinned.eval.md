---
name: D8 — dependency threats (hash-pin actions, Dependabot enabled)
decision: "Every GitHub Actions `uses:` line pins by 40-char commit SHA; .github/dependabot.yml exists and watches github-actions + docker"
wa_provenance:
  - https://wellarchitected.github.com/library/application-security/recommendations/managing-dependency-threats/
  - https://wellarchitected.github.com/library/application-security/recommendations/actions-security/  # #2 pin by SHA, #5 Dependabot
  - https://wellarchitected.github.com/library/scenarios/nist-ssdf-implementation/  # PW.4 reusable well-secured software
scope: both
timeout: 30
---

# Check

1. **Action SHA pinning** — every `uses:` line in
   `.github/workflows/*.yml` references either:
   - `uses: ./…` (local action, exempt),
   - `uses: org/repo@<40-hex>` (commit SHA), or
   - `uses: org/repo@<40-hex> # vX.Y.Z` (SHA with version comment,
     preferred).

   Implementation:
   ```bash
   unpinned=$(grep -hE '^\s*uses:' .github/workflows/*.yml 2>/dev/null \
     | grep -vE 'uses:\s*\./' \
     | grep -vE '@[0-9a-f]{40}')
   [ -z "$unpinned" ]
   ```

2. **Dependabot enabled** — `.github/dependabot.yml` exists AND
   declares `package-ecosystem: github-actions` (`docker` is
   bonus but not required until we add a Dockerfile).

Return `{"ok": true}` when both predicates pass. On failure,
name the specific workflow file or the missing config.

# Scorer

- `unpinned` is empty.
- `grep -q "package-ecosystem: \"github-actions\"" .github/dependabot.yml`
  (or unquoted equivalent) succeeds.

# Skip condition

If `.github/workflows/` is empty AND `.github/dependabot.yml`
is absent, return
`{"ok": true, "reason": "no Actions workflows yet — D8 activates once CI lands"}`.
This keeps the eval advisory rather than blocking on a fresh
repo that hasn't added workflows yet.
