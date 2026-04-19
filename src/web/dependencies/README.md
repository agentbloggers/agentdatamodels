# dependencies

Upstream dependency tracking — the **control plane** that keeps this
repo's canonical names, tool list, package pins, and plugin set in
sync with their GitHub sources and the Claude Code docs.

## Problem

Three kinds of drift bite a workflow-builder repo:

1. **Doc drift** — a Claude Code feature renames a flag or tool
   (`Task` → `Agent`). Our `src/web/` copy falls out of date.
2. **Package drift** — an upstream package ships a breaking change;
   our scripts assume the old API.
3. **Plugin drift** — `@name@marketplace` references an old version
   of a plugin; the marketplace updated it.

Our answer: pin **version + SHA256 + commit** for everything we
depend on, and re-verify via GraphQL + hash-diff on a schedule.

## Files

| File | Purpose |
|---|---|
| `manifest.yaml` | Declarative list of upstream orgs + repos + docs pages we track |
| `upstream-hashes.json` | SHA256 hashes of tracked doc-page snapshots + last-seen timestamps |
| `README.md` | This file |

## Data model

### Orgs + repos

```yaml
orgs:
  anthropics:
    type: github-org
    url: https://github.com/orgs/anthropics/repositories
    watched_repos:
      - { name: claude-code, pin: v2.1.114 }
      - { name: anthropic-sdk-typescript, pin: v0.90.0 }
```

### Pages

```yaml
pages:
  - url: https://code.claude.com/docs/en/tools-reference.md
    snapshot: src/web/tools/snapshots/tools-reference-2026-04-19.md
    sha256: a1391bf8d8abe12499319a782b15695a8014b206c7e75adf9d8cafda937d8f21
    last_seen: 2026-04-19
    downstream:
      - src/web/tools/README.md
```

When `make graphql-web` runs, it:

1. Re-fetches each `pages[*].url`
2. Computes SHA256
3. If changed: updates `snapshot`, writes new entry to
   `upstream-hashes.json`, and opens a task to regenerate each
   `downstream` file
4. For each `orgs[*].watched_repos[*]`: fires a GraphQL query against
   the GitHub API to get the latest release tag + HEAD commit; flags
   if pin has diverged

## Canonical-naming control plane

The Claude Code **tools list** is the canonical name source for
`permissions.allow`/`deny`, subagent `tools:` fields, hook matchers,
and slash-command references. It changes between CLI releases (e.g.
`Task` → `Agent` in v2.1.63).

GraphQL lets us:

- Query the `anthropics/claude-code` repo for release notes + tags
  around our pinned version
- Pull issue/PR titles that mention "rename" or "deprecate" to
  catch upcoming name changes
- Diff the tools-reference page at the pinned CLI version vs the
  latest release (both are `.md` files in-tree at the docs site,
  identifiable by tag)

See `.claude/scripts/graphql-deps.sh` for the actual queries.

## How `make graphql-web` uses this

1. Load `manifest.yaml`.
2. For each page: `curl -sL <url> | sha256sum` → compare to
   `upstream-hashes.json`.
3. For each changed page: re-snapshot under
   `src/web/<topic>/snapshots/<name>-<date>.md`, update hash, open a
   TODO entry.
4. For each watched repo: GraphQL query for latest release + HEAD
   commit. Compare to pin. Emit warning if drift > 1 minor version.
5. Write a run report to `.claude/graphql-runs/<date>.md`.

## Directives

- **Never** edit `upstream-hashes.json` by hand. It's machine-written
  by `make graphql-web`.
- **Never** bump a pin without running `make graphql-web` first — the
  new hash proves the upstream version actually exists.
- When an upstream page changes, the downstream file(s) need a human
  pass, not just a regen — names might have changed subtly.
- GitHub GraphQL API rate limit: 5000 points/hr. One `make graphql-web`
  run costs ~50 points, so it's fine hourly.

## Source

`src/web/glossary/` for terminology, `src/web/llms-txt/` for the full
doc URL list, `github-graphql` skill at
`.claude/skills/github-graphql/SKILL.md`
