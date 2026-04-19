# connectors

MCP servers + third-party integrations — how Claude Code reaches
outside itself.

## Two config paths

| Config | Scope | Cloud sees it? |
|---|---|---|
| `.mcp.json` (repo root) | Project | ✅ |
| `~/.claude.json` (via `claude mcp add`) | User | ❌ |
| `mcpServers` in a subagent's frontmatter | Subagent only | ✅ if repo-scoped |
| `--mcp-config <file-or-json>` | Single `-p` invocation | — |

Only project-scope `.mcp.json` and repo-scoped subagent `mcpServers`
propagate to cloud sessions.

## `.mcp.json` shape

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"]
    },
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "my-api": {
      "type": "http",
      "url": "https://mcp.example.com/"
    }
  }
}
```

Server types: `stdio`, `http`, `sse`, `ws`.

## Tool loading knob

By default MCP tool **names** load but **schemas** stay deferred until
a task needs them. Tune via:

- `ENABLE_TOOL_SEARCH=auto` — load schemas upfront if they fit within
  10% of the context window
- `ENABLE_TOOL_SEARCH=false` — load everything (old behavior)

## Third-party integrations

Slack, Telegram, Discord, iMessage channels — see
`/en/third-party-integrations` and `/en/channels`. Each channel runs
as either a plugin (local CLI bridge) or a cloud-hosted integration
(Slack).

## Directives

- MCP servers added via `claude mcp add` don't travel — write to
  `.mcp.json` for shared/cloud use.
- Scope MCP servers to one subagent with `mcpServers:` in frontmatter
  to keep their tool descriptions out of the main conversation's
  context.
- Cloud session network default is `Trusted`. If an MCP server needs
  an external host not on the allowlist, change env network access
  level to `Full` or `Custom`.

## Source

`/en/mcp`, `/en/third-party-integrations`, `/en/channels`,
`/en/channels-reference`, `/en/slack`
