---
name: D1 — graphql-web drift behavior
decision: "make graphql-web must exit 1 without overwriting upstream-hashes.json when a pinned page drifts"
wa_provenance:
  - https://wellarchitected.github.com/library/application-security/recommendations/managing-dependency-threats/
  - https://wellarchitected.github.com/library/application-security/design-principles/  # Keep it Simple
scope: both
timeout: 60
---

# Check

Simulate a drift on one tracked page without mutating repo state:

1. Read `src/web/dependencies/upstream-hashes.json`. Pick the first
   entry with a non-null `sha256`.
2. Copy the file to `/tmp/hashes-before.json`.
3. Replace that entry's `sha256` with a known-bogus string
   (`0000…0000`) in an ephemeral copy at `/tmp/hashes-bogus.json`.
4. Do NOT write back to the repo. Instead, compute what
   `make graphql-web` would do if it saw the bogus hash:
   - Confirm the script's contract in `.claude/scripts/track-upstream.sh`
     detects the diff and flags CHANGED in the run report.
5. Return `{"ok": true, "reason": "drift path reachable"}` when the
   script's code path would flag the drift, else
   `{"ok": false, "reason": "...why..."}`.

Do not modify any files under `src/web/` or `.claude/`.

# Scorer

- `diff -q /tmp/hashes-before.json src/web/dependencies/upstream-hashes.json` exits 0 (no repo mutation).
- `grep -q 'CHANGED' .claude/scripts/track-upstream.sh` returns 0
  (the drift branch exists in the script).
