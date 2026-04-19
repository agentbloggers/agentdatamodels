# tools

Canonical built-in tools for `@anthropic-ai/claude-code@2.1.114`,
captured from `https://code.claude.com/docs/en/tools-reference` on
2026-04-19.

> **Hash gate** — this file is pinned to the upstream doc snapshot at
> `snapshots/tools-reference-2026-04-19.md` (SHA256
> `a1391bf8d8abe12499319a782b15695a8014b206c7e75adf9d8cafda937d8f21`).
> If a newer hash appears via `make graphql-web`, this file is
> regenerated. See `src/web/dependencies/README.md` for the upstream
> tracking system.

## Canonical tool names (35)

Tool names are the exact strings used in `permissions.allow`/`deny`,
subagent `tools:` / `disallowedTools:`, and hook matchers.

| Tool | Permission | Purpose |
|---|---|---|
| `Agent` | No | Spawns a subagent with its own context window |
| `AskUserQuestion` | No | Multiple-choice questions to clarify |
| `Bash` | Yes | Shell commands |
| `CronCreate` | No | Schedule a recurring/one-shot prompt (session-scoped) |
| `CronDelete` | No | Cancel a scheduled task |
| `CronList` | No | List scheduled tasks |
| `Edit` | Yes | Targeted edits |
| `EnterPlanMode` | No | Switch to plan mode |
| `EnterWorktree` | No | Create / switch into an isolated git worktree |
| `ExitPlanMode` | Yes | Present a plan and exit plan mode |
| `ExitWorktree` | No | Return to original dir from a worktree |
| `Glob` | No | File pattern matching |
| `Grep` | No | Ripgrep content search |
| `ListMcpResourcesTool` | No | List resources from MCP servers |
| `LSP` | No | LSP code intelligence — definitions, references, type errors |
| `Monitor` | Yes | Background watcher; feeds each output line back (v2.1.98+) |
| `NotebookEdit` | Yes | Modify Jupyter notebook cells |
| `PowerShell` | Yes | Native PowerShell; opt-in on Linux/macOS/WSL via `CLAUDE_CODE_USE_POWERSHELL_TOOL=1` |
| `Read` | No | Read a file |
| `ReadMcpResourceTool` | No | Read a specific MCP resource by URI |
| `SendMessage` | No | Message an agent-teams teammate OR resume a subagent by ID; requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` |
| `Skill` | Yes | Execute a skill within the main conversation |
| `TaskCreate` | No | Create a task in the interactive task list |
| `TaskGet` | No | Full details for a task |
| `TaskList` | No | List tasks with status |
| `TaskOutput` | No | **DEPRECATED** — use `Read` on the output-file path instead |
| `TaskStop` | No | Kill a running background task |
| `TaskUpdate` | No | Update / delete a task |
| `TeamCreate` | No | Create an agent team; requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` |
| `TeamDelete` | No | Disband an agent team; same env gate |
| `TodoWrite` | No | Session task checklist — `-p` mode + Agent SDK (interactive sessions use `Task*` instead) |
| `ToolSearch` | No | Load deferred MCP tool schemas; gated by `ENABLE_TOOL_SEARCH` |
| `WebFetch` | Yes | Fetch + summarize a URL |
| `WebSearch` | Yes | Web search |
| `Write` | Yes | Create / overwrite files |

## Gating via env vars

| Var | Gates |
|---|---|
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | `SendMessage`, `TeamCreate`, `TeamDelete` |
| `CLAUDE_CODE_USE_POWERSHELL_TOOL=1` | `PowerShell` on Linux/macOS/WSL |
| `ENABLE_TOOL_SEARCH=auto\|false` | `ToolSearch` behavior for MCP schemas |
| `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1` | Bash/PowerShell `cd` carry-over |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Model override for subagent delegation |
| `DISABLE_TELEMETRY`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Disable `Monitor` tool |

## Task tools — interactive vs non-interactive

| Mode | Tools present |
|---|---|
| Interactive session | `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `TaskStop` |
| `-p` / bare / Agent SDK | `TodoWrite` (single tool that manages the list) |

## Bash tool behavior

- Each Bash call runs in a separate process.
- Main-session `cd` persists across Bash calls as long as the new cwd
  stays inside the project dir / `--add-dir` dirs. If not, Claude
  resets to the project dir and appends
  `Shell cwd was reset to <dir>`.
- Set `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1` to disable the
  carry-over entirely.
- Env vars do **not** persist. `export` in one call isn't visible in
  the next. For persistent env, use `CLAUDE_ENV_FILE` or a
  `SessionStart` hook.
- Subagents never carry over working-dir changes.

## LSP tool behavior

- Inactive until you install a code-intelligence plugin for your
  language (see `src/web/lsp/`).
- Plugin bundles server config; you install the server binary
  separately.
- Auto-reports type errors + warnings after each edit.
- Claude can call it directly for: jump-to-def, find-references,
  hover-type, list-symbols, find-implementations, call-hierarchy.

## Monitor tool

- Requires v2.1.98+. Not available on Bedrock / Vertex / Foundry.
- Disabled when `DISABLE_TELEMETRY` or
  `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` is set.
- Uses the same permission rules as `Bash` (so `allow`/`deny` Bash
  patterns apply).
- Plugins can declare monitors that start automatically — see
  `/en/plugins-reference#monitors`.

## MCP tools

MCP tool names are server-prefixed by the MCP server name in some
clients and flat in others — check `/mcp` for exact names in your
session. They appear alongside built-ins in `tools:` allowlists.

## Directives

- Always reference tools by exact name — allow/deny rules are
  string-matched.
- Don't give a subagent `Agent` — subagents can't spawn subagents.
- Prefer `disallowedTools` (denylist) over `tools` (allowlist) when
  you want to keep inherited MCP access while removing a single
  built-in.
- Treat `TaskOutput` as deprecated. Migrate to `Read` on the task's
  output-file path.
- `LSP`, `Monitor`, and `PowerShell` have env-var / version gates —
  check availability via `src/web/dependencies/` before relying on
  them in a routine.

## Snapshots

```
src/web/tools/snapshots/
  tools-reference-2026-04-19.md   # SHA256 a1391bf8…
```

## Source

`https://code.claude.com/docs/en/tools-reference.md` (fetched 2026-04-19),
`@anthropic-ai/claude-code@2.1.114`
