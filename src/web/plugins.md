# Plugins

## Marketplaces

Two catalogs the CLI talks to:

| Marketplace | Available by default? | How to add |
|---|---|---|
| `claude-plugins-official` | yes, always on | n/a |
| `anthropics-claude-code` (demo) | no | `/plugin marketplace add anthropics/claude-code` |

Add additional marketplaces from GitHub (`owner/repo`), any git URL
(with optional `#ref`), a local path, or a remote `marketplace.json`
URL.

## This repo's plugin set

Enabled in `.claude/settings.json` under `enabledPlugins` (project
scope = travels to cloud sessions).

### From `anthropics-claude-code`

| Plugin | Why it's here |
|---|---|
| `frontend-design` | Production-grade frontend interfaces — direct match for a repo whose first artifact came out of claude.ai/design |
| `feature-dev` | 7-phase feature dev loop (explorer / architect / reviewer agents) |
| `commit-commands` | `/commit`, `/commit-push-pr`, `/clean_gone` |
| `code-review` | Parallel-agent PR review with confidence scoring |
| `pr-review-toolkit` | Six specialized PR reviewers (types, comments, silent failures, etc.) |
| `claude-md-management` | Keeps CLAUDE.md honest — detects bloat, dead references, paid-every-turn waste |
| `plugin-dev` | Scaffolds and tests new plugins in this repo |
| `agent-sdk-dev` | Dev toolkit for Agent SDK workflows (`@anthropic-ai/claude-agent-sdk`) |
| `mcp-server-dev` | Scaffold, test, and publish MCP servers — directly relevant to MCP Server Dev work here |
| `skill-creator` | Author and validate new skills without leaving the session |
| `hookify` | Turns directives into enforced hooks (SessionStart / PreToolUse / PostToolUse / Stop) |
| `claude-code-setup` | Bootstrap and health-check new Claude Code projects; complements `make doctor-web` |
| `ralph-loop` | Cloud analogue of `/loop` — schedule recurring prompts from cloud sessions and Routines |
| `session-report` | Explorable HTML report of a session — tokens, cache efficiency, subagents, skills. Surfaces data the CLI otherwise hides. |

### From `claude-plugins-official`

| Plugin | Why it's here |
|---|---|
| `github` | MCP GitHub integration for the PR flow |
| `typescript-lsp` | LSP diagnostics if/when we bundle the dashboard with types |
| `figma` | If design drops start coming via Figma |
| `playwright` | Browser automation via Microsoft's MCP server — enables real DOM/JS testing of `index.html` beyond the current `make test-web` smoke fetch |

## Install scopes

| Scope | Config location | Propagates to cloud sessions? |
|---|---|---|
| `user` | `~/.claude/settings.json` | ❌ |
| `project` | repo `.claude/settings.json` | ✅ |
| `local` | repo `.claude/settings.local.json` (gitignored) | ❌ |
| `managed` | admin-controlled via managed settings | ❌ |

**Only `project` scope propagates to cloud sessions.** This repo's
design-labs plugin set is declared in `project` scope so Routines and
other cloud-session work get them automatically.

## Management commands

```
/plugin                                     # open the manager UI (Discover / Installed / Marketplaces / Errors)
/plugin install <name>@<marketplace>        # install
/plugin disable <name>@<marketplace>        # keep installed, don't load
/plugin enable <name>@<marketplace>         # re-enable
/plugin uninstall <name>@<marketplace>      # remove
/plugin marketplace add <source>            # add a catalog
/plugin marketplace list                    # list catalogs
/plugin marketplace update <name>           # refresh catalog
/plugin marketplace remove <name>           # remove (also uninstalls plugins from it)
/reload-plugins                              # apply changes without restart
```

Non-interactive equivalent (for CI / docs):

```
claude plugin install <name>@<marketplace> --scope project
claude plugin uninstall <name>@<marketplace> --scope project
```

## Env vars that gate updates

| Var | Effect |
|---|---|
| `DISABLE_AUTOUPDATER` | Disables all auto-updates (CLI + plugins) |
| `FORCE_AUTOUPDATE_PLUGINS=1` | Keep plugin auto-updates even when `DISABLE_AUTOUPDATER` is set |

Official Anthropic marketplaces have auto-update **on** by default;
third-party marketplaces have it **off**.

## Skill namespacing

Plugin skills are namespaced by plugin name. After installing
`pr-review-toolkit` you get `/pr-review-toolkit:review-pr`. After
installing `commit-commands` you get `/commit-commands:commit` (or the
plugin's exposed aliases — check each plugin's README).

## Security

Plugins execute arbitrary code with your user privileges. Only install
from sources you trust. Anthropic doesn't verify third-party plugins —
read the code before enabling.

Organizations can restrict which marketplaces users can add via
`managed marketplace restrictions`.

## Debugging

- **Marketplace not loading**: check the URL, verify
  `.claude-plugin/marketplace.json` exists at the path.
- **Install failure**: ensure plugin source URL is accessible and the
  repo is public / you have access.
- **Skills not appearing**: `rm -rf ~/.claude/plugins/cache`, restart
  Claude Code, reinstall.
- **"Executable not found in $PATH"** (common for LSP plugins): install
  the underlying language server binary referenced in the plugin's
  Errors tab.
