# terminal-cli

Claude Code CLI surface — everything that lives in the terminal.

## Install

```bash
npm install -g @anthropic-ai/claude-code@2.1.114
claude --version   # should print 2.1.114
```

## Invocations

| Invocation | Purpose |
|---|---|
| `claude` | Interactive REPL |
| `claude "<prompt>"` | Interactive, starts with a prompt |
| `claude -p "<prompt>"` | One-shot programmatic |
| `claude --bare -p "<prompt>"` | One-shot with all auto-discovery skipped |
| `claude --continue` | Continue most recent conversation in cwd |
| `claude --resume` / `--resume <id>` | Pick / resume a local session |
| `claude --remote "<prompt>"` | New cloud session from current repo |
| `claude --teleport` / `--teleport <id>` | Pull a cloud session down locally |
| `claude --remote-control [name]` / `--rc` | Session with RC enabled |
| `claude remote-control` | Server mode (multi-session RC) |
| `claude agents` | List all configured subagents |
| `claude plugin install <name>@<marketplace>` | Non-interactive plugin install |
| `claude mcp add <name> <cmd>` | Add MCP server (user scope — does NOT travel) |

## Built-in slash commands

`/login`, `/logout`, `/config`, `/model`, `/permissions`, `/memory`,
`/context`, `/compact`, `/cost`, `/extra-usage`, `/recap`, `/init`,
`/plan`, `/agents`, `/plugin`, `/mcp`, `/skill`, `/hooks`, `/statusline`,
`/output-style`, `/web-setup`, `/remote-control`, `/teleport`,
`/tasks`, `/schedule`, `/ultraplan`, `/ultrareview`, `/autofix-pr`,
`/mobile`, `/remote-env`, `/rename`, `/clear`, `/exit`,
`/reload-plugins`.

## Key env vars

See `src/web/primitives.md` for the full table. Most-used:

- `ANTHROPIC_API_KEY` — auth
- `CLAUDE_CODE_REMOTE_SESSION_ID` — session id inside cloud VM
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` — compact earlier
- `ENABLE_TOOL_SEARCH` — `auto` / `false` for MCP schema loading
- `CCR_FORCE_BUNDLE=1` — force `--remote` to bundle local repo
- `CLAUDE_CODE_SUBAGENT_MODEL` — override subagent model

## Directives

- Keep `claude --version` at the project's pinned release. Drift
  between machines causes flag / feature inconsistency.
- Don't use `claude mcp add` for anything that needs to run in a
  Routine or cloud session — write to repo `.mcp.json` instead.
- `claude agents` is the fastest sanity check when a subagent
  isn't being delegated to.

## Source

`/en/cli-reference`, `/en/setup`, `/en/terminal-config`,
`/en/quickstart`
