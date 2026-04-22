# News sources — the two CHANGELOGs Gemmah reacts to

Gemmah's videos are reactions to deltas in the `claude-code` CLI
`CHANGELOG.md`. We watch two canonical sources; both should agree but
occasionally drift by a few hours.

## Sources

| # | URL | Format | Notes |
|---|---|---|---|
| 1 | `https://code.claude.com/docs/en/changelog.md` | markdown | Anthropic-hosted public docs mirror |
| 2 | `https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md` | markdown | GitHub-rendered. Raw: `https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md` |

Always prefer the **raw** URL for source 2 (the `blob/` URL returns
HTML). The fetcher script uses:

```
https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md
```

## Fetch cadence

- **Polling**: every run of `.claude/scripts/flow-fetch-news.sh`
- **Intended trigger**: a Routine fires this hourly (see
  `src/web/directives.md`) — but in v1 we run it manually before each
  video.
- **Hash storage**: `.claude/graphql-runs/flow-news-<YYYY-MM-DD>.json`
  with keys:
  ```json
  {
    "fetched_at": "2026-04-20T12:00:00Z",
    "sources": [
      { "url": "https://code.claude.com/...",     "sha256": "…", "delta_from_prev": "…markdown…" },
      { "url": "https://raw.githubusercontent.com/...", "sha256": "…", "delta_from_prev": "…markdown…" }
    ]
  }
  ```
- The delta is computed against the previous day's snapshot (diff of
  new lines only, header-scoped — we only care about new bullet
  points under the latest version header).

## Conflict handling

If the two sources disagree on a given version's bullet list:

- Prefer **source 2 (GitHub)** — it's the raw authored source.
- Log the divergence under the run JSON's `warnings[]` array.
- Proceed with generation on the GitHub-sourced delta.

## Privacy

Both sources are public. No auth required. No PII exposure. We do
NOT pull internal Anthropic docs, private repos, or any source
requiring `GH_TOKEN`.

## Source of this convention

`CLAUDE.md` at repo root pins the current CLI version to
`@anthropic-ai/claude-code@2.1.114`. The CHANGELOG sources above are
the authoritative record of what's in each release — we treat the
*delta* between two fetches as the content prompt for Gemmah.
