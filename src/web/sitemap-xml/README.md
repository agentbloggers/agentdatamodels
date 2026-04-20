# sitemap-xml

For programmatic discovery of what's on `code.claude.com` and
`docs.claude.com`, a sitemap is the authoritative list — no guessing
URLs.

## URLs

- `https://code.claude.com/sitemap.xml` — Claude Code docs
- `https://docs.claude.com/sitemap.xml` — Anthropic API docs
- `https://www.anthropic.com/sitemap.xml` — Anthropic.com (research,
  blog, etc.)

## Use alongside llms.txt

| Source | Purpose |
|---|---|
| `sitemap.xml` | Canonical "what pages exist" |
| `llms.txt` | Flat list of doc-surface URLs for LLM consumption |
| `llms-full.txt` | Same list but with full page contents inlined |

`llms.txt` is the fastest reference for an LLM-driven workflow to
decide which page to fetch. `sitemap.xml` is the ground truth when
`llms.txt` might be stale.

## Directives

- When a workflow needs to crawl docs, start from `llms.txt`, fall
  back to `sitemap.xml`.
- Never scrape the site root or follow all internal links — it'll
  pick up pagination and search URLs.
- The weekly `/en/whats-new/<year>-w<week>.md` pages change most
  often — worth subscribing / polling separately.

## Source

`code.claude.com/docs/llms.txt` returns 150 URLs including
`whats-new/2026-w13`, `whats-new/2026-w14`, `whats-new/2026-w15`
