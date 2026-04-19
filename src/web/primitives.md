# Primitives

Factual surface. Exact names only. Grouped by surface.

## Slash commands

| Command | Where | Purpose |
|---|---|---|
| `/login` | CLI | Authenticate with claude.ai |
| `/web-setup` | CLI (≥ v2.1.80) | Sync local `gh` token to Claude account; auto-create default cloud env |
| `/remote-control` (`/rc`) | CLI / VS Code | Expose current session for web/mobile control |
| `/teleport` (`/tp`) | CLI | Pull a cloud session down into current terminal |
| `/tasks` | CLI | List running/background cloud + local sessions; press `t` to teleport |
| `/schedule` (+ `list` / `update` / `run`) | CLI | Create + manage Routines conversationally |
| `/remote-env` | CLI | Show / set default cloud environment for `--remote` |
| `/ultraplan` | CLI (≥ v2.1.91) | Draft a plan on Claude Code on the web |
| `/ultrareview [PR#]` | CLI (≥ v2.1.86) | Deep multi-agent code review in a cloud sandbox |
| `/autofix-pr` | CLI | Watch a PR and auto-fix CI failures + review comments |
| `/mobile` | CLI | Print QR for the Claude iOS/Android app |
| `/rename` | CLI | Set session title |
| `/compact` | CLI / cloud | Summarize conversation to free context (supports focus instructions) |
| `/context` | CLI / cloud | Show current context window usage |
| `/config` | CLI | Open interactive config picker (not available in cloud sessions) |
| `/plugin` (+ `install` / `disable` / `enable` / `uninstall`) | CLI | Interactive plugin manager (not available in cloud) |
| `/plugin marketplace` (+ `add` / `list` / `update` / `remove`) | CLI | Manage marketplaces |
| `/reload-plugins` | CLI | Apply plugin changes without restart |
| `/mcp` | CLI | Interactive MCP server picker (local-only) |
| `/resume` | CLI | Open local-history session picker (local-only) |
| `/clear` | CLI | Reset conversation (local-only — cloud requires starting a new session) |

## CLI invocation flags

```
claude -p "<prompt>"                     # programmatic (alias --print; was "headless")
claude --bare -p "<prompt>"              # skip auto-discovery of hooks/skills/plugins/MCP/memory/CLAUDE.md
claude --remote "<prompt>"               # new cloud session
claude --teleport [session-id]           # pull cloud session down; --teleport alone opens a picker
claude --remote-control [name]           # interactive session with RC enabled
claude remote-control                    # server mode (stays running, accepts multiple RC clients)
claude --resume                          # open local-history picker
claude --version                          # confirm CLI version
```

### `claude remote-control` server-mode flags

| Flag | Purpose |
|---|---|
| `--name "My Project"` | Session title in the claude.ai/code list |
| `--remote-control-session-name-prefix <prefix>` | Auto-gen prefix (also `CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX`) |
| `--spawn same-dir\|worktree\|session` | Per-connection session strategy. Press `w` to toggle between `same-dir` and `worktree`. |
| `--capacity <N>` | Max concurrent sessions (default 32). Not valid with `--spawn=session`. |
| `--verbose` | Connection + session logs |
| `--sandbox` / `--no-sandbox` | Enable/disable filesystem + network isolation |

### `claude -p` / bare-mode flags

| Flag | Purpose |
|---|---|
| `--output-format text\|json\|stream-json` | Response shape |
| `--verbose --include-partial-messages` | Required with `stream-json` for token deltas |
| `--json-schema '{…}'` | Constrain JSON output (response has `structured_output`) |
| `--allowedTools "Read,Edit,Bash(git diff *)"` | Pre-approve tools. Trailing ` *` = prefix match. |
| `--permission-mode acceptEdits\|dontAsk\|plan\|…` | Session-wide baseline |
| `--append-system-prompt "<text>"` / `--append-system-prompt-file <path>` | Add to default system prompt |
| `--system-prompt "<text>"` | Replace default system prompt |
| `--settings <file-or-json>` | Settings to load (includes `apiKeyHelper`) |
| `--mcp-config <file-or-json>` | MCP servers to load |
| `--agents <json>` | Custom subagent definitions |
| `--plugin-dir <path>` | Load plugins from a local directory |
| `--continue` | Continue most recent conversation |
| `--resume <session-id>` | Resume a specific session |

## Environment variables

| Var | Effect |
|---|---|
| `ANTHROPIC_API_KEY` | API key (fallback when not logged in) |
| `CLAUDE_CODE_REMOTE` | `true` inside a cloud session |
| `CLAUDE_CODE_REMOTE_SESSION_ID` | Session ID, use to back-link PRs/commits: `https://claude.ai/code/$CLAUDE_CODE_REMOTE_SESSION_ID` |
| `CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX` | Default prefix for RC session names |
| `CCR_FORCE_BUNDLE=1` | Force `--remote` to bundle local repo instead of using GitHub |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | Trigger auto-compaction at N% of the window (default ~95) |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | Override effective window size for compaction calculations |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | Enable agent-teams in cloud sessions |
| `CLAUDE_ENV_FILE` | Path to write env vars that persist across SessionStart hook Bash calls |
| `GH_TOKEN` | GitHub PAT consumed by `gh` inside cloud sessions |
| `ENABLE_TOOL_SEARCH=auto\|false` | Control upfront MCP tool-schema loading |
| `DISABLE_AUTOUPDATER` | Disable all auto-updates |
| `FORCE_AUTOUPDATE_PLUGINS=1` | Keep plugin auto-updates when disabling CLI auto-update |
| `CLAUDE_CODE_SYNC_PLUGIN_INSTALL` | Emit `system/plugin_install` stream events before first turn |
| `CLAUDE_CODE_USE_BEDROCK=1` | Route Agent SDK through Amazon Bedrock |
| `CLAUDE_CODE_USE_VERTEX=1` | Route Agent SDK through Google Vertex AI |
| `CLAUDE_CODE_USE_FOUNDRY=1` | Route Agent SDK through Microsoft Azure Foundry |

## Files that DO carry over to cloud sessions

(Because they're in the repo clone.)

- `CLAUDE.md`
- `.claude/settings.json` (includes `enabledPlugins`, `hooks`, `permissions`, `extraKnownMarketplaces`)
- `.claude/rules/`
- `.claude/skills/*/SKILL.md`
- `.claude/agents/<name>.md`
- `.claude/commands/<name>.md`
- `.mcp.json`
- `MEMORY.md` / `.claude/MEMORY.md` (auto-memory)

## Files that DO NOT carry over

(They live on the user's machine only.)

- `~/.claude/CLAUDE.md`
- `~/.claude/settings.json` (user-scope `enabledPlugins` — declare in repo `.claude/settings.json` instead)
- Anything added via `claude mcp add` (writes to user config)

## Session-URL prefill

```
https://claude.ai/code?prompt=<urlencoded>&repositories=<owner/repo,…>&environment=<name-or-id>&prompt_url=<url>
```

Aliases: `q` for `prompt`, `repo` for `repositories`. `prompt_url` is
ignored if `prompt` is also set.

## Routines `/fire` HTTP API

```
POST https://api.anthropic.com/v1/claude_code/routines/<trigger_id>/fire
Authorization: Bearer <per-routine-token>
anthropic-beta: experimental-cc-routine-2026-04-01
anthropic-version: 2023-06-01
Content-Type: application/json

{ "text": "<optional freeform context passed to the prompt>" }
```

Response:

```json
{
  "type": "routine_fire",
  "claude_code_session_id": "session_01…",
  "claude_code_session_url": "https://claude.ai/code/session_01…"
}
```

Breaking changes ship under new dated beta headers; two prior dated
headers keep working during migration.

## Cloud VM limits

| Resource | Ceiling |
|---|---|
| vCPU | 4 |
| RAM | 16 GB |
| Disk | 30 GB |
| Environment cache | ~7 days |
| Remote Control idle-network timeout | ~10 min |

## Cloud network access levels

- `None` — no outbound
- `Trusted` — allowlist of package registries + GitHub + cloud SDKs (default)
- `Full` — any domain
- `Custom` — user-specified allowlist (optionally + defaults)

## Cloud permission modes available

- `Auto accept edits` (default)
- `Plan`

No `Ask`, `Auto`, or `Bypass permissions` in cloud sessions.

## Routines: supported GitHub trigger events

- `pull_request.*` (opened / closed / assigned / labeled / synchronize / …)
- `release.*`

## Pull-request filters (all AND-combined)

Author, Title, Body, Base branch, Head branch, Labels, Is draft, Is
merged. Operators: `equals`, `contains`, `starts with`, `is one of`,
`is not one of`, `matches regex` (regex tests the entire field).

## Version floors

| Feature | Min CLI |
|---|---|
| Remote Control | v2.1.51 |
| VS Code `/remote-control` | v2.1.79 |
| `/web-setup` | v2.1.80 |
| `/ultrareview` | v2.1.86 |
| `/ultraplan` | v2.1.91 |
| Mobile push notifications | v2.1.110 |
| Current pinned release in this repo | v2.1.114 |
