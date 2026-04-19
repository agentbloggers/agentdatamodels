# Redis cache strategy for tracked doc URLs

Phase C.7 design doc. Target consumers: `make graphql-web`, the
`track-upstream` subagent, future Routines that read docs to answer
"what does `/en/hooks.md` say about `$CLAUDE_ENV_FILE`".

## What we cache

Every URL in `manifest.yaml` → `pages:` + every URL in
`cli-reference-pages.json` → `.pages`. Currently **17 families /
47 concrete URLs** across five domains:

| Domain | Families | Purpose |
|---|---|---|
| `code.claude.com/docs/en/*.md` | 20 | CLI reference — primitives/directives source of truth |
| `code.claude.com/docs/llms.txt` | 1 | Catalog of the full CLI doc set |
| `wellarchitected.github.com/library/...` | 8 | WA Q1 2026 anchor pages |
| `docs.github.com/en/enterprise-cloud@latest/*` | 3 | GHE IAM + SSO + GitHub Apps |
| `microsoft.github.io/language-server-protocol/*` | 7 | LSP 3.17 spec + implementor lists |
| `github.com/.../pull/*.patch` | 2 | PR-anchored decisions (D3) |

## Cache-key shape

```
key:   url:<sha1(url)>     (40 hex chars — fits Redis "simple string")
value: JSON object, schema below
```

`sha1(url)` not `sha256(url)` — the sha256 column belongs to the
cached *value* (the page body hash), not the key. Using sha1 for
keys avoids accidental confusion in logs / audit trails.

## Cache-value schema

```jsonc
{
  "url":            "https://code.claude.com/docs/en/hooks.md",
  "title":          "Hooks reference",
  "html_url":       "https://code.claude.com/docs/en/hooks",
  "sha256":         "124344dc4896d480638c4ce20c7e77be5d68b2afc0c5150ed0dfe6388709754a",
  "fetched_at":     "2026-04-19T19:48:16Z",
  "last_seen":      "2026-04-19",
  "ttl_until":      "2026-04-20T19:48:16Z",
  "content_path":   "src/web/dependencies/snapshots/hooks-2026-04-19.md",
  "etag":           "W/\"..\""  // optional; from the fetch response
}
```

`content_path` is a filesystem reference to the snapshot file
(large payload). Redis holds the metadata; the body lives on disk.
Keeps Redis memory predictable.

## TTL policy

**24 hours from last_seen.** Rationale:
- `make graphql-web` runs nightly (Phase C scope) and bumps
  `last_seen` on every successful fetch, so the cache never goes
  cold by accident.
- 24h is shorter than any reasonable upstream cadence — we see
  drift on the same run or the next scheduled job.
- Per WA Managing Dependency Threats, the cache MUST NOT bypass
  the sha256 drift check. Redis is **read-through**; the on-disk
  `upstream-hashes.json` remains authoritative for drift decisions.

Invalidation:
- `SET` on every successful `curl` in `track-upstream.sh`.
- `DEL url:<sha1(url)>` when `manifest.yaml` drops a URL.
- Expiry: `SETEX ttl_until` relative to fetched_at.

## Read path

```
        ┌───────────────┐
        │  make graphql │
        │      -web     │
        └──────┬────────┘
               ▼
      ┌────────────────┐   hit   ┌──────────────┐
      │ Redis  GET url │────────▶│ compare sha  │
      └───────┬────────┘         └──────────────┘
              │ miss
              ▼
      ┌────────────────┐
      │ curl upstream  │
      └───────┬────────┘
              ▼
      ┌────────────────┐
      │ snapshot + SET │
      └────────────────┘
```

## Redis-side example (`redis-cli`)

```bash
sha1=$(printf '%s' 'https://code.claude.com/docs/en/hooks.md' | sha1sum | awk '{print $1}')
redis-cli GET "url:$sha1"
```

Inserts use `SET` with `PX` for millisecond-precision TTL:

```bash
redis-cli SET "url:$sha1" "$json_value" PX 86400000
```

## Cross-ref to D-level decisions

| Decision | How this cache supports it |
|---|---|
| D1 (drift behavior) | `sha256` column in value mirrors `upstream-hashes.json`; cache reads cross-check against on-disk hash |
| D8 (dependency threats) | TTL forces re-fetch once per day, catching upstream churn inside the pin horizon |
| D10 (knowledge layout) | When `src/web/` migrates to `.github-private/knowledge/`, the cache keeps the *URL* as key — path churn is invisible to consumers |
| D11 (stream-idle-timeout resilience — proposed) | Cache hits mean a resumed session doesn't re-fetch and re-stream; reduces partial-response risk |

## Provenance

- `src/web/dependencies/cli-reference-pages.json` — user-supplied
  mapping this cache is designed against
- `src/web/dependencies/manifest.yaml` — authoritative URL list
- `https://wellarchitected.github.com/library/application-security/recommendations/managing-dependency-threats/`
- `https://wellarchitected.github.com/library/application-security/design-principles/` — "Keep it Simple"
