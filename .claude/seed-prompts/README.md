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
| 003 | `003-makefile-services-graphql-control-plane.md` | 2026-04-19 | Start Postgres+Redis, build Makefile, hash-gate docs, use GraphQL as control-access plane |
| 004 | `004-octokit-markdown-neon-enterprise.md` | 2026-04-19 | Pin @octokit/graphql + markdown-it; document Neon isolated subagents, Well-Architected, Max OAuth, HF, Cloudflare 20 |
| 005 | `005-polyrepo-not-deferred.md` | 2026-04-19 | Polyrepo is in flight, not deferred — document the full recommendation |
| 006 | `006-check-and-save-seed-prompts.md` | 2026-04-19 | Meta: verify seed-prompt format + save remaining session prompts |

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
