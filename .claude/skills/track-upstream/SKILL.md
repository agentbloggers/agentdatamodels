---
name: track-upstream
description: Use when the user wants to check whether upstream dependencies (Claude Code docs pages, pinned GitHub repos, plugin versions) have drifted from what's recorded in src/web/dependencies/manifest.yaml. Triggers on phrases like "check upstream", "any drift", "has the tools reference changed", "refresh hashes", "are our pins still valid", "graphql-web".
---

# track-upstream

Runs the repo's dependency control plane: hash-checks every tracked
docs page, GraphQL-queries every watched GitHub repo, writes a run
report, and flags drift.

## When to invoke

- Before a release — confirm nothing upstream has shifted.
- After CLI version bump — the tools list or settings schema may
  have changed.
- On a schedule (weekly) — via a Routine that calls
  `make graphql-web` and posts the report to Slack.
- When a downstream file (`src/web/tools/README.md` etc.) feels
  out of date.

## How

One command:

```bash
make graphql-web
```

Internally:

1. `bash .claude/scripts/track-upstream.sh` — fetch + SHA256 each
   `pages[*].url` in `src/web/dependencies/manifest.yaml`, compare
   to `upstream-hashes.json`, snapshot changed pages, update
   hashes.
2. `bash .claude/scripts/graphql-deps.sh` — for each
   `orgs[*].watched_repos[*]`, GraphQL-query latest release + HEAD
   commit, compare to `pin`, flag drift.

Run reports land in `.claude/graphql-runs/<timestamp>-*.md`.

## Requirements

- `gh` authenticated (via `GH_TOKEN`).
- Python 3 with `pyyaml` (for parsing the manifest).
- `curl`, `sha256sum`, `jq`.

In a cloud session, `make bootstrap-web` installs everything. On
local dev: `apt install gh && pip install pyyaml` (or equivalent).

## Hash-gated control plane

Each downstream file in `src/web/` can be thought of as "derived
from a pinned upstream page at a known hash." When the hash
changes, the derived file is stale — possibly still accurate, but
unverified.

**The hash doesn't regenerate downstream files automatically.**
It flags them for review by the `docs-librarian` subagent. That
subagent reads the new snapshot, diffs against the old one, and
updates prose + naming in the downstream file.

## Directive: what to do with a CHANGED hash

1. Read the new snapshot at
   `src/web/<topic>/snapshots/<slug>-<date>.md`.
2. Read the previous snapshot (git history) and diff mentally.
3. Ask: did any canonical name change? (Tool name, flag name, env
   var, slash command, frontmatter field.)
4. If yes: update the downstream file(s) listed in
   `manifest.yaml` → `pages[].downstream`.
5. If no: still update `upstream-hashes.json.last_seen`
   (the hash tracker already does this on the next successful run).

## Directive: what to do with pin DRIFT

1. Read the latest release notes at
   `github.com/<owner>/<repo>/releases/tag/<latest>`.
2. Decide whether to adopt.
3. If adopting: update `pin` in `manifest.yaml`, regenerate
   downstream docs, update lock files.
4. If deferring: leave the pin as-is — drift is expected between
   verified-known-good versions and upstream HEAD.

## Output example

```
.claude/graphql-runs/2026-04-19T12-34-56Z-track-upstream.md

# track-upstream run — 2026-04-19T12:34:56Z

| URL | previous sha256 | new sha256 | status |
|---|---|---|---|
| https://code.claude.com/docs/en/tools-reference.md | a1391bf8… | a1391bf8… | unchanged |
| https://code.claude.com/docs/en/headless.md | (none) | 7b2c3d4e… | NEW |

## Summary
- changed:   0
- unchanged: 1
- new:       1
```
