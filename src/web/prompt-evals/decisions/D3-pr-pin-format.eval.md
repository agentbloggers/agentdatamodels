---
name: D3 — PR pin uses .patch URL, not HTML
decision: "PR references in manifest.yaml pin against github.com/<owner>/<repo>/pull/<N>.patch (stable diff + commit metadata), never the rendered HTML view"
wa_provenance:
  - https://wellarchitected.github.com/library/application-security/recommendations/managing-dependency-threats/  # pin by immutable ref
  - https://wellarchitected.github.com/library/application-security/recommendations/actions-security/  # pin Actions to commit SHAs
scope: both
timeout: 30
---

# Check

1. Grep `src/web/dependencies/manifest.yaml` for any
   `github.com/.*/pull/\d+` reference.
2. For every match, assert the URL ends in `.patch` (not `.html`,
   `.diff`, or no suffix).
3. For each `.patch` URL found, fetch twice 5 seconds apart and
   compare `sha256sum`. Hashes must match (proves the `.patch`
   surface is stable against HTML-churn).
4. Return `{"ok": true}` when all PR references are `.patch` AND
   double-fetch stability holds. Otherwise name the specific URL
   and failure reason.

# Scorer

- `grep -oE 'github.com/[^[:space:]]+/pull/[0-9]+(\.[a-z]+)?' src/web/dependencies/manifest.yaml`
  returns only `.patch`-suffixed URLs (or nothing).
- Double-fetch sha256 equality holds for each.

# Skip condition

If no PR references exist in manifest.yaml, return
`{"ok": true, "reason": "no PR pins to check"}`.
