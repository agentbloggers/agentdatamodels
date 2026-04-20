# Claude Agent SDK

Formerly called the **Claude Code SDK**. The library surface that runs
the Claude Code agent loop programmatically, with Claude handling tool
execution and the loop internally.

## Packages

| Language | Package |
|---|---|
| TypeScript / JavaScript | `@anthropic-ai/claude-agent-sdk` |
| Python | `claude-agent-sdk` |

The TS package bundles a native Claude Code binary as an optional
dependency per platform, so no separate CLI install is required.

## Primary entry point

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Find and fix the bug in auth.ts",
  options: { allowedTools: ["Read", "Edit", "Bash"] },
})) {
  console.log(message);
}
```

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="Find and fix the bug in auth.py",
        options=ClaudeAgentOptions(allowed_tools=["Read", "Edit", "Bash"]),
    ):
        print(message)

asyncio.run(main())
```

`query` returns an async iterable of messages. A `system` init message
early in the stream carries `session_id`; capture it to `resume` later.

## Options

TS: plain object. Python: `ClaudeAgentOptions`.

Key fields (TS / Python):

| Field | Purpose |
|---|---|
| `allowedTools` / `allowed_tools` | Pre-approve tool names |
| `permissionMode` / `permission_mode` | `"acceptEdits"`, `"plan"`, etc. |
| `hooks` | Map of hook-name → matcher + callback list |
| `agents` | Custom subagent definitions |
| `mcpServers` / `mcp_servers` | MCP server configs |
| `resume` | Session id to continue |
| `settingSources` / `setting_sources` | Restrict which `.claude/` sources to load |
| `plugins` | Programmatic plugin config |

## Built-in tools

`Read`, `Write`, `Edit`, `Bash`, `Monitor`, `Glob`, `Grep`, `WebSearch`,
`WebFetch`, `AskUserQuestion`, `Agent` (for delegating to subagents).

## Hooks

Hook names: `PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`,
`SessionEnd`, `UserPromptSubmit`, and more.

TS callback type: `HookCallback`. Python helper:
`HookMatcher(matcher=…, hooks=[…])`.

```typescript
import { query, HookCallback } from "@anthropic-ai/claude-agent-sdk";
import { appendFile } from "fs/promises";

const logFileChange: HookCallback = async (input) => {
  const filePath = (input as any).tool_input?.file_path ?? "unknown";
  await appendFile("./audit.log", `${new Date().toISOString()}: modified ${filePath}\n`);
  return {};
};

for await (const message of query({
  prompt: "Refactor utils.ts to improve readability",
  options: {
    permissionMode: "acceptEdits",
    hooks: {
      PostToolUse: [{ matcher: "Edit|Write", hooks: [logFileChange] }],
    },
  },
})) {
  if ("result" in message) console.log(message.result);
}
```

## Subagents

Define inline. Include `Agent` in `allowedTools` since subagents are
invoked through the `Agent` tool. Messages from a subagent's context
carry `parent_tool_use_id` — use it to route output back.

```typescript
await query({
  prompt: "Use the code-reviewer agent to review this codebase",
  options: {
    allowedTools: ["Read", "Glob", "Grep", "Agent"],
    agents: {
      "code-reviewer": {
        description: "Expert code reviewer for quality and security reviews.",
        prompt: "Analyze code quality and suggest improvements.",
        tools: ["Read", "Glob", "Grep"],
      },
    },
  },
});
```

```python
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

await query(
    prompt="Use the code-reviewer agent to review this codebase",
    options=ClaudeAgentOptions(
        allowed_tools=["Read", "Glob", "Grep", "Agent"],
        agents={
            "code-reviewer": AgentDefinition(
                description="Expert code reviewer.",
                prompt="Analyze code quality and suggest improvements.",
                tools=["Read", "Glob", "Grep"],
            )
        },
    ),
)
```

## Sessions

Capture `session_id` from the init message, pass it as `resume` later.

```typescript
let sessionId: string | undefined;

for await (const message of query({ prompt: "Read the auth module" })) {
  if (message.type === "system" && message.subtype === "init") {
    sessionId = message.session_id;
  }
}

for await (const message of query({
  prompt: "Now find all places that call it",
  options: { resume: sessionId },
})) {
  if ("result" in message) console.log(message.result);
}
```

## Filesystem config it picks up

When `settingSources` allows:

- `.claude/skills/*/SKILL.md`
- `.claude/commands/*.md`
- `.claude/agents/*.md`
- `CLAUDE.md` / `.claude/CLAUDE.md`

Restrict the sources explicitly when building something production-like
— don't inherit the user's `~/.claude` in a hosted service.

## Auth

| Env var | Effect |
|---|---|
| `ANTHROPIC_API_KEY` | Default |
| `CLAUDE_CODE_USE_BEDROCK=1` | Route through Amazon Bedrock |
| `CLAUDE_CODE_USE_VERTEX=1` | Route through Google Vertex AI |
| `CLAUDE_CODE_USE_FOUNDRY=1` | Route through Microsoft Azure Foundry |

Anthropic does not permit claude.ai login or rate-limit sharing for
third-party products built on the Agent SDK. Use API-key auth.

## Opus 4.7 floor

Requires Agent SDK ≥ **v0.2.111**. Older versions fail with a
`thinking.type.enabled` API error.

## Agent SDK vs Client SDK

| | Client SDK (`@anthropic-ai/sdk`) | Agent SDK (`@anthropic-ai/claude-agent-sdk`) |
|---|---|---|
| Tool loop | you implement it | Claude handles it |
| Built-in tools | no | yes (`Read`, `Edit`, `Bash`, …) |
| Session management | no | yes (`resume` sessions) |
| Filesystem config | no | reads `.claude/` if allowed |
| Use when | you want raw Messages API control | you want Claude Code's loop programmatically |

See `sdk.md` for the Client SDK surface.

## Branding

- Allowed: "Claude Agent", "Claude", "{YourAgentName} Powered by Claude"
- Not permitted: "Claude Code" / "Claude Code Agent" / Claude Code ASCII
  art / visuals that mimic Claude Code

## Changelog & bugs

- TS CHANGELOG: `github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md`
- Python CHANGELOG: `github.com/anthropics/claude-agent-sdk-python/blob/main/CHANGELOG.md`
- Issues: `github.com/anthropics/claude-agent-sdk-{typescript,python}/issues`
- Example agents: `github.com/anthropics/claude-agent-sdk-demos`
