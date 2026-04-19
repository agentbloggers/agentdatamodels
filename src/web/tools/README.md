# tools

Built-in tools available to Claude Code and the Agent SDK as of
`claude-code@2.1.114` / Agent SDK v0.2.111+.

## Core file tools

| Tool | Purpose |
|---|---|
| `Read` | Read a file (or image / PDF / notebook) at an absolute path |
| `Write` | Create or overwrite a file — must `Read` before overwriting |
| `Edit` | Exact-match string replacement; `replace_all` for bulk renames |
| `NotebookEdit` | Replace a Jupyter cell |
| `Glob` | File pattern matching (`src/**/*.ts`) |
| `Grep` | Ripgrep-based content search with regex, `-A`/`-B`/`-C`, `multiline`, `type`, `glob` |

## Shell + background

| Tool | Purpose |
|---|---|
| `Bash` | Shell commands; `run_in_background: true` for long runs |
| `Monitor` | Stream stdout from a background process (each line = one notification) |

## Agent delegation

| Tool | Purpose |
|---|---|
| `Agent` | Spawn a subagent; was called `Task` before v2.1.63 (still accepted as alias) |
| `AskUserQuestion` | Ask the user a structured question mid-task |
| `ExitPlanMode` | Exit plan mode with a proposed plan |

## Web + planning

| Tool | Purpose |
|---|---|
| `WebFetch` | Fetch and summarize a URL (blocked for authenticated URLs) |
| `WebSearch` | Query the web |
| `TodoWrite` | Maintain a structured to-do list for the current session |
| `ToolSearch` | Load deferred MCP tool schemas on demand |
| `Skill` | Invoke a listed skill by name |

## Directives

- Read a file before editing it — `Edit` fails otherwise.
- Prefer `Glob` / `Grep` over Bash `find` / `grep` — dedicated tools have
  better permission handling.
- Never include `Agent` in a **subagent**'s tool list — subagents can't
  spawn subagents.
- When restricting tools, prefer `disallowedTools` (denylist) over
  `tools` (allowlist) if you want to keep inherited MCP access.

## Source

`/en/tools-reference`, `/en/sub-agents`, `/en/agent-sdk/custom-tools`
