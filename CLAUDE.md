# agentdatamodels

This repo is a workshop for developers **building workflows that drive the
`claude-code` CLI from outside the terminal** — via Dispatch (mobile →
Desktop), Routines (schedule / `/fire` API / GitHub events), Scheduled
Tasks (local, Desktop, or cloud), Remote Control, prompt-prefilled
`claude.ai/code` sessions, and programmatic `claude -p` / `--bare`
invocations in CI.

The static benchmark dashboard (`index.html`, `components/*.jsx`) is one
artifact produced by that workflow — it was authored on `claude.ai/design`
and handed off to this repo. The reference material in `src/web/` is the
knowledge base. Expect both to grow.

Current Claude Code CLI: `@anthropic-ai/claude-code@2.1.114`.
Pinned upstream versions live in `src/web/dependencies/manifest.yaml`.

## Make targets

`Makefile` at repo root — every target is idempotent:

- `make bootstrap-web` — install `gh`, start services, auth via `$GH_TOKEN`
- `make install-web` — project-level deps (currently no-op — static site)
- `make start-web` — start Postgres + Redis + check Docker
- `make stop-web` — stop Postgres + Redis
- `make lint-web` — YAML frontmatter + JSON validity checks
- `make fmt-web` — pretty-print JSON in place
- `make test-web` — smoke-serve `index.html` and fetch it
- `make doctor-web` — health check (services, gh auth, CLI version, session URL)
- `make build-web` — no-op for now (static site)
- `make graphql-web` — hash-check tracked docs + GraphQL-query pinned repos

Bootstrap is only needed in a cloud session — locally you probably
already have everything.

## Where to load context from

Load `src/web/` files on demand — don't grep all of them up front.

- `src/web/README.md` — index of the folder
- `src/web/primitives.md` — commands, flags, env vars, URLs, endpoints
- `src/web/directives.md` — conduct rules per context (web, cloud, RC, routines…)
- `src/web/surfaces.md` — CLI / Desktop / IDE / Web / RC / mobile comparison
- `src/web/plugins.md` — marketplace model + the design-labs plugin set
- `src/web/agent-sdk.md` — `@anthropic-ai/claude-agent-sdk` primitives
- `src/web/sdk.md` — `@anthropic-ai/sdk` primitives (lower-level)
- `src/web/headless.md` — `claude -p` / `--bare` for CI & scripts
- `src/web/context-window.md` — what auto-loads, window-budget rules
- `src/web/claude-dir.md` — `.claude/` layout + cloud visibility
- `src/web/dependencies/` — upstream manifest + `make graphql-web` control plane
- `src/web/tools/` — canonical built-in tool names (hash-gated to `tools-reference`)
- `src/web/graphql/` — GitHub GraphQL primitives + reusable queries
- `src/web/markdown/` — `markdown-it` architecture + our usage
- `src/web/neon/` — Neon per-subagent DB branching
- `src/web/wellarchitected/` — GitHub Well-Architected framework (polyrepo deferred)
- `src/web/enterprise/` — Claude Code Max OAuth, GH Enterprise, HF premium, Cloudflare
- `src/web/references.md` — external canon (cookbooks, skills repo, npm, SDKs)
- `src/web/sources.md` — provenance for every claim above

## Non-terminal entry points we care about

- **Dispatch** — message a task from the Claude mobile app; spawns a
  Desktop session on a paired Mac. Minimal setup.
- **Routines** — saved cloud-session configs (prompt + repos +
  connectors) triggered by schedule, HTTP POST to a per-routine `/fire`
  endpoint, or GitHub events (`pull_request.*`, `release.*`).
- **Scheduled tasks** — `/loop` in a live CLI session, local Desktop
  scheduled tasks, and cloud Routines; different trigger surfaces,
  same spirit.
- **Prompt-prefilled web sessions** — open
  `claude.ai/code?prompt=…&repositories=…&environment=…&prompt_url=…`
  from an issue tracker or chatbot to start a cloud session with
  context already loaded.
- **Remote Control** — drive a local CLI (or VS Code) session from
  `claude.ai/code` or the mobile app. Local process must stay alive.
- **`claude -p` / `--bare`** — the programmatic CLI mode (formerly
  "headless"). The right call from a Routine setup script, a CI job,
  or anywhere else that can't be interactive.

See `src/web/directives.md` for what to do and not do in each.

## Model defaults

Default to `claude-opus-4-7` for any Claude API or Agent SDK code. Never
use date-suffixed model IDs (no `claude-sonnet-4-5-20250514`). Use
`claude-opus-4-6`, `claude-sonnet-4-6`, or `claude-haiku-4-5` only when
the user explicitly names them.

Agent SDK floor for Opus 4.7 is v0.2.111+. Older SDKs fail with a
`thinking.type.enabled` error.

## House rules

- Edit existing files rather than creating new ones. If a new file is
  unavoidable, it almost certainly belongs under `src/web/`.
- Don't create planning, analysis, or decision documents unless
  explicitly asked.
- Defer to `src/web/directives.md` for behavioral rules in
  web/cloud/Remote-Control contexts.
- Keep this file short — it auto-loads into every session's context
  window (local and cloud). Move detail to `src/web/` instead.

## What `CLAUDE.md` is NOT

Not a dumping ground for project docs, meeting notes, or decisions. It
is the first thing Claude reads every session — treat every line as
paid-on-every-turn.
