# sessions

Session lifecycle primitives for `claude-code@2.1.114`.

## Primitives

- **`session_id`** — emitted in the first `system/init` stream event; in
  JSON output it lives at `.session_id`. Capture it:
  ```bash
  session_id=$(claude -p "Start a review" --output-format json | jq -r '.session_id')
  ```
- **`--continue`** — continue the most-recent conversation in the cwd.
- **`--resume <id>`** — resume a specific session (local history only).
- **Cloud session IDs** — the URL is
  `https://claude.ai/code/${CLAUDE_CODE_REMOTE_SESSION_ID}`. `claude --teleport`
  + picker or `--teleport <id>` pulls a cloud session down locally.
- **`/tasks`** — lists running + background cloud and local sessions; press
  `t` to teleport, `r` to rename.
- **`claudeMdExcludes`** (`.claude/settings.local.json`) — skip ancestor
  `CLAUDE.md` files in monorepos.

## Subagent sessions

Subagent transcripts persist **independently** of the main conversation
and survive `/compact` on the parent. Cleanup period: 30 days (default,
`cleanupPeriodDays`). Resume a subagent by:

1. Capture `session_id` from the parent `system/init`.
2. Extract `agentId` from the Agent tool result (regex
   `/agentId:\s*([a-f0-9-]+)/`).
3. Next `query()` call passes `resume: sessionId` and references the
   `agentId` in the prompt.

## Directives

- Always persist `session_id` for any `-p` / bare invocation that may
  need follow-up — `--continue` breaks the moment you change cwd.
- `--resume` only works against local history, not cloud.
- Cloud sessions do **not** support `/clear` — start a new one instead.

## Source

`/en/agent-sdk/sessions`, `/en/claude-code-on-the-web`, `/en/headless`
