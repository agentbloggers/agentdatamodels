# llms-full-txt

The full-content companion to `llms.txt`.

## URL

`https://code.claude.com/docs/llms-full.txt`

Where `llms.txt` is a flat URL list, `llms-full.txt` inlines each
page's markdown body. It's a large single file — worth fetching once
and searching locally rather than for on-the-fly questions.

## When to use

| Need | File |
|---|---|
| "Which URL has X?" | `llms.txt` |
| "Give me everything about hooks in one file" | `llms-full.txt`, grep for `## Hooks` |
| "I'm offline / building a local search" | `llms-full.txt` |
| "One-off factual lookup" | Direct WebFetch of `/en/<slug>.md` |

## Directives

- Don't load `llms-full.txt` into a context window — it's larger than
  the 200K budget by a wide margin.
- For in-session lookups, prefer direct page fetches
  (`/en/<slug>.md`) listed in `llms-txt/README.md`.
- For pre-indexing / embedding / RAG over Claude Code docs, this is
  the right source file. Chunk on `^# ` or `^## ` headings.

## Source

`code.claude.com/docs/llms-full.txt` (referenced from
`code.claude.com/docs/llms.txt`)
