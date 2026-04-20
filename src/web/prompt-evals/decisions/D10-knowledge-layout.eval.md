---
name: D10 — src/web/ mirrors .github-private/knowledge/<domain>/ layout
decision: "Every first-level subdirectory under src/web/ that contains >1 file has a README.md at its root, so git mv to agentbloggers/.github-private/knowledge/ works without restructuring"
wa_provenance:
  - https://wellarchitected.github.com/library/architecture/recommendations/expanding-enterprise-custom-agents-context/  # .github-private/knowledge/<domain>/*.md layout
scope: both
timeout: 30
---

# Check

For every directory `D` directly under `src/web/`:

1. If `D` contains 0 or 1 files, skip (README not required for
   leaf-only or empty dirs).
2. If `D` contains >1 file, assert `D/README.md` exists.

Implementation:

```bash
missing=()
for d in src/web/*/; do
  count=$(find "$d" -maxdepth 1 -type f | wc -l)
  if [ "$count" -gt 1 ] && [ ! -f "$d/README.md" ]; then
    missing+=("$d")
  fi
done
[ ${#missing[@]} -eq 0 ]
```

Return `{"ok": true}` when `missing` is empty. Otherwise return
`{"ok": false, "reason": "README.md missing in: <list>"}`.

# Scorer

- `find src/web -mindepth 2 -maxdepth 2 -type d` divided against
  `find src/web -mindepth 2 -maxdepth 2 -name README.md`:
  every multi-file subdir has a README.

# Skip condition

None. This eval should always run — it's cheap and catches drift
before we migrate to `.github-private/knowledge/`.
