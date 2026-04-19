# Sources & version floors

Provenance for every claim in `src/web/`. All pages are under research
preview unless noted — behavior and flags can change.

## Claude Code web / cloud sessions

| Source | Covers | Status |
|---|---|---|
| `code.claude.com/docs/en/web-quickstart` | Onboarding, prefilled URL params, `/web-setup`, create-environment dialog | Research preview |
| `code.claude.com/docs/en/claude-code-on-the-web` | Cloud VM specs, network access levels, setup scripts, environment caching, `--remote` / `--teleport`, auto-fix PRs, session management | Research preview |
| `code.claude.com/docs/en/remote-control` | `claude remote-control` server mode + flags, RC session lifecycle, mobile push | GA on all plans; Team/Enterprise admin-gated |
| `code.claude.com/docs/en/platforms` | CLI / Desktop / VS Code / JetBrains / Web / mobile comparison; remote-access trigger table | GA |
| `code.claude.com/docs/en/routines` | Routines concept, `/schedule`, API `/fire` endpoint + beta header, GitHub trigger events + filters | Research preview |
| `code.claude.com/docs/en/ultraplan` | `/ultraplan`, browser review, three execution outcomes | Research preview |
| `code.claude.com/docs/en/ultrareview` | `/ultrareview [PR#]`, free-run allotment, extra-usage billing, exclusions | Research preview |

## Claude Code CLI + runtime

| Source | Covers | Status |
|---|---|---|
| `code.claude.com/docs/en/context-window` | 200K budget, auto-loaded blocks, `ENABLE_TOOL_SEARCH`, `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, MCP tool deferral | GA |
| `code.claude.com/docs/en/claude-directory` | `.claude/` layout, `CLAUDE.md`, `settings.json`, skills vs commands, rules, hooks, auto `MEMORY.md`, project vs user scope | GA |
| `code.claude.com/docs/en/headless` | `claude -p`, `--bare`, output formats, `--json-schema`, `--allowedTools`, `--permission-mode`, stream event types | GA; `-p` was called "headless mode" |
| `code.claude.com/docs/en/discover-plugins` | Marketplaces, `/plugin` commands, install scopes, `enabledPlugins`, `extraKnownMarketplaces`, auto-update env vars | GA |
| `code.claude.com/docs/en/agent-sdk/overview` | `query({prompt, options})`, built-in tools, hooks, subagents, sessions, auth envs | GA (beta features within) |

## GitHub / npm

| Source | What we pulled |
|---|---|
| `github.com/anthropics/claude-code/tree/main/plugins` | Plugin list and manifests for the demo marketplace (`commit-commands`, `feature-dev`, `frontend-design`, `pr-review-toolkit`, `code-review`, …) |
| `github.com/anthropics/skills` | Skills repo layout (`.claude-plugin/`, `skills/`, `spec/`, `template/`) and document-skill names (`docx`, `pdf`, `pptx`, `xlsx`) |
| `github.com/anthropics/claude-cookbooks` | 17 cookbook directories |
| `github.com/anthropics/anthropic-sdk-typescript` | `@anthropic-ai/sdk` namespaces + v0.90.0 |
| `npmjs.com/package/@anthropic-ai/claude-code/v/2.1.114` | Current CLI pin (package page returned 403 on fetch; version confirmed via bundled-skills path `bundled-skills/2.1.114/…`) |

## Version floors (Claude Code CLI)

| Feature | Min CLI |
|---|---|
| Remote Control | v2.1.51 |
| VS Code `/remote-control` | v2.1.79 |
| `/web-setup` | v2.1.80 |
| `/ultrareview` | v2.1.86 |
| `/ultraplan` | v2.1.91 |
| Mobile push notifications | v2.1.110 |
| This repo's pinned version | v2.1.114 |

## Version floors (Agent SDK)

| Feature | Min SDK |
|---|---|
| Opus 4.7 support | v0.2.111 |

## Notable not-available-on lists

- **Zero Data Retention organizations**: `/web-setup`, all cloud-session
  features, `/ultrareview`.
- **Amazon Bedrock / Google Vertex AI / Microsoft Foundry**:
  Managed Agents, `/ultrareview`, claude.ai login for Agent SDK
  products.
- **API key auth only** (no claude.ai OAuth): Remote Control fails.
  `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` / `DISABLE_TELEMETRY` can
  also break eligibility checks.

## Beta headers referenced

| Header | Where used |
|---|---|
| `experimental-cc-routine-2026-04-01` | Routines `/fire` POST |
| `managed-agents-2026-04-01` | `client.beta.{agents,environments,sessions,vaults}.*` |
| `skills-2025-10-02` | Skills API (`/v1/skills`) |
| `files-api-2025-04-14` | Files API (`/v1/files`) |
| `compact-2026-01-12` | Server-side compaction |
| `task-budgets-2026-03-13` | Opus 4.7 task budgets |

## When to refetch

Refetch the source when:
- A claim here contradicts what the user's CLI does
- A flag doesn't exist on the user's version — check their `claude --version`
- A beta header returns 400 — newer dated headers may have replaced it
- Before using any feature in production (research preview = things move)
