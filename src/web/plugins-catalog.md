# Official Anthropic plugin / connector / skill catalog

A **snapshot** of every officially offered plugin, MCP connector,
and skill from Anthropic's `claude-plugins-official` marketplace
and adjacent official surfaces. This file exists so a session can
see the full menu without installing everything — context bloat
is the failure mode `CLAUDE.md` explicitly warns against.

**Not enabled ≠ not available.** Every row below can be reached
via `/plugin install <name>@claude-plugins-official`. This repo
only enables the rows flagged ✅ in `.claude/settings.json`; the
rest stay on-demand.

Provenance: `https://claude.com/plugins` +
`https://code.claude.com/docs/en/discover-plugins` (both pinned
in `src/web/dependencies/manifest.yaml` — drift-checked by
`make graphql-web`).

## Code Intelligence (LSP plugins)

LSP plugins require the binary installed separately; if missing,
the `/plugin` Errors tab surfaces "Executable not found in $PATH".

| Plugin | Language | Binary | Enabled here |
|---|---|---|---|
| `clangd-lsp` | C / C++ | `clangd` | ❌ |
| `csharp-lsp` | C# | `csharp-ls` | ❌ |
| `gopls-lsp` | Go | `gopls` | ❌ |
| `jdtls-lsp` | Java | `jdtls` | ❌ |
| `kotlin-lsp` | Kotlin | `kotlin-language-server` | ❌ |
| `lua-lsp` | Lua | `lua-language-server` | ❌ |
| `php-lsp` | PHP | `intelephense` | ❌ |
| `pyright-lsp` | Python | `pyright-langserver` | ❌ (add when a `.py` module lands) |
| `rust-analyzer-lsp` | Rust | `rust-analyzer` | ❌ |
| `swift-lsp` | Swift | `sourcekit-lsp` | ❌ |
| `typescript-lsp` | TS / JS / TSX / JSX | `typescript-language-server` | ✅ |

No official LSP plugin exists for JSON / YAML / Markdown. Our gap
fill lives at `.claude-plugins/docs-lsp/` — see
`src/web/lsp/README.md`.

## Design + dev plugins (from `anthropics-claude-code`)

| Plugin | Purpose | Enabled here |
|---|---|---|
| `frontend-design` | Production-grade frontend interfaces (direct match for a claude.ai/design handoff repo) | ✅ |
| `feature-dev` | 7-phase feature-dev loop — explorer / architect / reviewer agents | ✅ |
| `commit-commands` | `/commit`, `/commit-push-pr`, `/clean_gone` | ✅ |
| `code-review` | Parallel-agent PR review with confidence scoring | ✅ |
| `pr-review-toolkit` | Six specialized PR reviewers (types, comments, silent failures, etc.) | ✅ |

## Integrations (MCP connectors)

| Plugin | Wraps | Enabled here |
|---|---|---|
| `github@claude-plugins-official` | GitHub MCP server (`mcp__github__*`) — PR / issue / code search / ruleset read | ✅ |
| `figma@claude-plugins-official` | Figma MCP — read designs, extract assets | ✅ |
| `slack@claude-plugins-official` | Slack MCP — read channel, send message, search | on-demand |
| `linear@claude-plugins-official` | Linear MCP — issues, cycles, initiatives | on-demand |
| `lucid@claude-plugins-official` | Lucidchart / Lucidspark MCP — create/edit diagrams | on-demand |
| `cloudflare@claude-plugins-official` | Cloudflare MCP — D1, Workers, KV, R2, Hyperdrive | planned (Phase C-adjacent) |
| `huggingface@claude-plugins-official` | HuggingFace Hub MCP — models, datasets, spaces, papers | planned |
| `supermetrics@claude-plugins-official` | Marketing/ad/analytics data | on-demand |
| `context7@claude-plugins-official` | Library docs lookup (`resolve-library-id` + `query-docs`) | on-demand |
| `google-calendar@claude-plugins-official` | Calendar MCP — events, responses, suggestions | on-demand |
| `gmail@claude-plugins-official` | Gmail MCP — threads, drafts, labels | on-demand |

Enable a connector only when its task is in-flight — MCP tool
schemas count against the context window. `ENABLE_TOOL_SEARCH=auto`
uses deferred-tool loading so installed-but-unused schemas stay
out of context.

## Skills (official)

Ship as part of the CLI or marketplace plugins. Invoke with
`/<skill-name>` or via the Skill tool.

| Skill | Source | Purpose |
|---|---|---|
| `/update-config` | CLI built-in | Settings/permissions/env edits |
| `/keybindings-help` | CLI built-in | Custom keybindings for `~/.claude/keybindings.json` |
| `/simplify` | CLI built-in | Review-and-simplify code changes |
| `/fewer-permission-prompts` | CLI built-in | Scan transcripts, add allowlist |
| `/loop` | CLI built-in | Recurring prompt |
| `/claude-api` | CLI built-in | Build/debug Anthropic SDK code with caching |
| `/session-start-hook` | CLI built-in | Create SessionStart hooks for web cloud |
| `/github-graphql` | CLI built-in | GraphQL over REST for GitHub beyond v3 |
| `/octokit-paginate` | CLI built-in | Walk pages of GitHub GraphQL results |
| `/track-upstream` | CLI built-in | Check manifest.yaml pin drift |
| `/init` | CLI built-in | Initialize CLAUDE.md |
| `/review` | CLI built-in | Review a PR |
| `/security-review` | CLI built-in | Security review of pending changes |

Future skills of interest (from `anthropics/skills` repo — pinned
as `main` in `manifest.yaml`):

- `docx` / `xlsx` / `pptx` / `pdf` — Office/PDF round-tripping
- `artifacts-builder` — build claude.ai artifacts from spec
- `slack-gifs` — Slack GIF search/post composite

## Channels

Channels are distribution surfaces, not plugins, but they belong
in the same mental model. Install with
`claude --channels plugin:<name>@<marketplace>`:

- `telegram-channel` — drive sessions from Telegram
- `discord-channel` — drive from Discord
- `imessage-channel` — macOS-only iMessage driver
- `fakechat-channel` — local UI for dev testing

Per `src/web/primitives.md` + `channels-reference.md` (pinned) —
channels require `claude.ai` login for auth, run as background
processes, and fire `type: "http"` hook callbacks.

## What this repo installs today

```jsonc
// .claude/settings.json → enabledPlugins
{
  "frontend-design@anthropics-claude-code": true,   // design handoff
  "feature-dev@anthropics-claude-code":     true,   // 7-phase loop
  "commit-commands@anthropics-claude-code": true,
  "code-review@anthropics-claude-code":     true,
  "pr-review-toolkit@anthropics-claude-code": true,
  "github@claude-plugins-official":         true,   // org PR/issue/ruleset reads
  "typescript-lsp@claude-plugins-official": true,   // TSX benchmark dashboard
  "figma@claude-plugins-official":          true    // design drops
}
```

Everything else in this catalog is **available on demand** via
`/plugin install` or `/plugin marketplace add …`. When a task
pattern recurs enough to warrant always-on status, promote it
here and enable in `.claude/settings.json`.

## Directives

- **Never** bulk-install every plugin. Each installed plugin
  contributes tools/commands/skills to the context window.
- When a task needs a new connector, install in a branch, use it,
  decide whether to keep it. Uninstall defaults back to clean.
- Catalog drift: when `https://claude.com/plugins` or
  `discover-plugins.md` change, `make graphql-web` flags it;
  update this file in the same PR.
- For code-intelligence gaps not covered by official LSP plugins
  (JSON, YAML, Markdown, shell, dockerfile, terraform), author a
  local plugin under `.claude-plugins/<name>/` — see
  `.claude-plugins/docs-lsp/` as the reference pattern.

## Source

- `https://claude.com/plugins` (official marketplace catalog)
- `https://code.claude.com/docs/en/discover-plugins` (CLI-side catalog)
- `https://code.claude.com/docs/en/plugins-reference` (plugin.json spec)
- `https://code.claude.com/docs/en/channels-reference` (channel model)
- Repo: `src/web/plugins.md`, `src/web/lsp/README.md`
