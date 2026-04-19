# llms-txt

`https://code.claude.com/docs/llms.txt` — the flat LLM-optimized
index of all Claude Code docs.

## What it is

A markdown file that lists every doc URL grouped under headings.
Designed for agents to read once and then fetch specific pages on
demand.

## Current shape (as of fetch)

```
## Agent SDK Documentation
- https://code.claude.com/docs/en/agent-sdk/agent-loop.md
- https://code.claude.com/docs/en/agent-sdk/claude-code-features.md
- …
- https://code.claude.com/docs/en/agent-sdk/typescript-v2-preview.md
- https://code.claude.com/docs/en/agent-sdk/user-input.md

## Core Features & Guides
- https://code.claude.com/docs/en/agent-teams.md
- …
- https://code.claude.com/docs/en/platforms.md

## Plugins & Extensions
- https://code.claude.com/docs/en/plugin-dependencies.md
- …
- https://code.claude.com/docs/en/plugins-reference.md

## Additional Resources
- https://code.claude.com/docs/en/quickstart.md
- …
- https://code.claude.com/docs/en/web-quickstart.md

## What's New (Weekly Updates)
- https://code.claude.com/docs/en/whats-new/2026-w13.md
- https://code.claude.com/docs/en/whats-new/2026-w14.md
- https://code.claude.com/docs/en/whats-new/2026-w15.md
- https://code.claude.com/docs/en/whats-new/index.md

## Additional
- https://code.claude.com/docs/en/zero-data-retention.md

**Total: 150 documentation URLs**
```

## Key pages for workflow authors

| Topic | URL |
|---|---|
| Agent SDK overview | `/en/agent-sdk/overview.md` |
| Subagents (file-based) | `/en/sub-agents.md` |
| Subagents (SDK) | `/en/agent-sdk/subagents.md` |
| Memory | `/en/memory.md` |
| Context window | `/en/context-window.md` |
| Hooks | `/en/hooks.md` + `/en/hooks-guide.md` |
| Skills | `/en/skills.md` + `/en/agent-sdk/skills.md` |
| Plugins | `/en/plugins.md` + `/en/plugins-reference.md` + `/en/plugin-marketplaces.md` + `/en/plugin-dependencies.md` |
| Permissions | `/en/permissions.md` + `/en/permission-modes.md` |
| Routines | `/en/routines.md` |
| Remote control | `/en/remote-control.md` |
| Headless / `-p` | `/en/headless.md` |
| CLI reference | `/en/cli-reference.md` |
| Env vars | `/en/env-vars.md` |
| Best practices | `/en/best-practices.md` |
| Agent teams | `/en/agent-teams.md` |

## Directives

- Any doc lookup inside a workflow should begin with `llms.txt`.
- Each URL is valid as both `.md` (raw markdown) and without the
  suffix (rendered HTML). Fetch `.md` for model consumption.
- Weekly "what's new" pages live at `/en/whats-new/<year>-w<week>.md`.
  Poll `whats-new/index.md` to discover new weeks.

## Source

`code.claude.com/docs/llms.txt` — fetched 150 URLs total
