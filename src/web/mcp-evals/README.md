# mcp-evals

Evaluating MCP (Model Context Protocol) server integrations.

## What to measure

| Question | Metric |
|---|---|
| Is the server reachable? | `system/init` `mcpServers` entry `status: connected` |
| Are tools loading? | `system/init` `tools` list contains the server's tools |
| Are deferred schemas hurting? | Toggle `ENABLE_TOOL_SEARCH` and compare latency |
| Is the tool's output consistent? | Replay same request, diff outputs |

## Checklist for a new MCP integration

1. Define in `.mcp.json` (project scope — travels to cloud).
2. Start a session with `ENABLE_TOOL_SEARCH=false` to force-load
   schemas and verify every tool appears.
3. Invoke each tool once with a known input; capture output into
   a golden file.
4. Re-run with `ENABLE_TOOL_SEARCH=auto` to confirm tool-search
   discovers the right tool for real prompts.
5. If the server is heavy (many tools, verbose descriptions), scope
   it to a subagent via `mcpServers:` frontmatter.

## Failure modes

- **Schemas inflate context**: server exposes 50+ tools with long
  descriptions. Fix: scope to subagent, or `ENABLE_TOOL_SEARCH=auto`.
- **`stdio` server hangs**: the server writes logs to stdout instead
  of stderr. Fix the server.
- **`http` server fails in cloud**: network access level is
  `Trusted`. Fix: `Full` or `Custom` with the server's host added.
- **Wrong tool invoked**: two tools with overlapping descriptions.
  Fix: clarify descriptions.

## Directives

- Don't enable a new MCP server globally. Start scoped to a skill or
  subagent.
- For cloud sessions, always put MCP config in `.mcp.json`, never
  `claude mcp add`.
- Test MCP connectivity on first session-start hook — cloud envs
  restart fresh every session.

## Source

`/en/mcp`, `/en/agent-sdk/mcp`
