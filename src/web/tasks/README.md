# tasks

Scheduled / recurring / deferred task primitives.

## Three scheduling surfaces

| Surface | Lives in | Use when |
|---|---|---|
| `/loop <interval> <cmd>` | a live CLI session | ad-hoc in-session poll (expires after ~7 days) |
| Desktop scheduled tasks | Claude Desktop app, local | needs local files, runs on your machine |
| Cloud Routines | claude.ai account, hosted | should keep running when your laptop is closed |

## CLI `/loop`

```
/loop 5m /tests          # run /tests every 5 minutes
/loop 30m check deploy   # model-driven self-paced interval
```

Expires ~7d; kill with `/loop stop`.

## Desktop scheduled tasks

See `/en/desktop-scheduled-tasks`. Configured in the Desktop app's
Scheduled Tasks panel. Good for "every morning pull main and run
linters."

## Cloud Routines

Saved cloud-session configs (prompt + repos + connectors) triggered by:

- **Schedule** (cron-like)
- **HTTP POST** to a per-routine `/fire` endpoint
- **GitHub events** (`pull_request.*`, `release.*`)

`/fire` API:

```
POST https://api.anthropic.com/v1/claude_code/routines/<trigger_id>/fire
Authorization: Bearer <per-routine-token>
anthropic-beta: experimental-cc-routine-2026-04-01
anthropic-version: 2023-06-01
Content-Type: application/json

{ "text": "<optional extra context>" }
```

Response:
```json
{
  "type": "routine_fire",
  "claude_code_session_id": "session_01…",
  "claude_code_session_url": "https://claude.ai/code/session_01…"
}
```

## Directives

- Routines run autonomously — **no approval prompts mid-run**. Prompt
  must be self-contained.
- Default push rule: `claude/`-prefixed branches only. Toggle
  "Allow unrestricted branch pushes" per repo to override.
- Per-routine + per-account hourly caps apply to GitHub webhook
  trigger events during research preview.
- `/fire` beta header is dated. Two prior dated headers keep working
  during migration windows.

## Source

`/en/routines`, `/en/scheduled-tasks`, `/en/desktop-scheduled-tasks`,
`loop` skill in bundled-skills (claude-code v2.1.114)
