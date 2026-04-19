# Seed prompts

Verbatim user prompts from real sessions in this repo, captured as
the canonical example corpus for evals and onboarding.

Format: one markdown file per prompt, ordered by capture time
(`NNN-<slug>.md`). Body is the verbatim prompt. Frontmatter records
metadata.

## Index

| # | File | Captured | Intent |
|---|---|---|---|
| 001 | `001-repo-positioning.md` | 2026-04-19 | Set repo positioning (workflow builder for claude-code outside terminal) |
| 002 | `002-subdirs-and-subagents.md` | 2026-04-19 | Scaffold src/web/ subdirs, .claude-plugins/, GitHub GraphQL, subagent system |

## Conventions

- **Verbatim** — don't edit the user's words.
- **Attribution-free** — don't include names, emails, URLs the user
  considers private.
- **Keep it tight** — 20–50 prompts total, pruned as superseded.

## Usage

- As eval inputs: pass each prompt through `claude -p --bare` and
  score the result.
- As onboarding reference: a new contributor reads these to see the
  kinds of tasks this repo handles.
- As a quality check: when a new feature lands, verify the seed
  prompts still produce sensible output.

## Source

Maintained by the `seed-prompt-keeper` subagent (see
`.claude/agents/seed-prompt-keeper.md`).
