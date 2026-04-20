# Headless / `claude -p` — programmatic CLI

The CLI was previously called **headless mode**. It's now just "run
the CLI programmatically." All interactive flags work with `-p`.

## Invocation

```bash
claude -p "Find and fix the bug in auth.py"
claude -p "Summarize this project" --output-format json
echo "<diff>" | claude -p --append-system-prompt "You are a security engineer."
```

## Bare mode — for CI / scripted calls

```bash
claude --bare -p "Summarize this file" --allowedTools "Read"
```

`--bare` skips auto-discovery of:
- Hooks
- Skills
- Plugins
- MCP servers
- Auto memory (`MEMORY.md`)
- `CLAUDE.md`

Reintroduce only what the script needs via explicit flags:

| To load | Use |
|---|---|
| System prompt additions | `--append-system-prompt "<text>"`, `--append-system-prompt-file <path>` |
| Settings | `--settings <file-or-json>` |
| MCP servers | `--mcp-config <file-or-json>` |
| Custom agents | `--agents <json>` |
| A plugin directory | `--plugin-dir <path>` |

Bare also skips OAuth / keychain reads — auth must come from
`ANTHROPIC_API_KEY` or an `apiKeyHelper` entry in `--settings`.
Bedrock / Vertex / Foundry use their usual provider credentials.

`--bare` is recommended for scripted and SDK calls and will become the
default for `-p` in a future release.

## Output formats

```bash
--output-format text            # default, plain text
--output-format json            # structured JSON with result, session_id, metadata
--output-format stream-json     # newline-delimited JSON events (use with --verbose --include-partial-messages)
```

## Structured output

```bash
claude -p "Extract main function names from auth.py" \
  --output-format json \
  --json-schema '{"type":"object","properties":{"functions":{"type":"array","items":{"type":"string"}}},"required":["functions"]}'
```

Response shape:
```json
{
  "session_id": "…",
  "result": "…",
  "structured_output": { "functions": ["login", "logout"] },
  "usage": { … }
}
```

`jq` patterns:
```bash
# Extract the text result
claude -p "Summarize this project" --output-format json | jq -r '.result'

# Extract structured output
claude -p "..." --output-format json --json-schema '…' | jq '.structured_output'
```

## Streaming deltas

```bash
claude -p "Explain recursion" \
  --output-format stream-json --verbose --include-partial-messages
```

Join token deltas with `jq`:
```bash
claude -p "Write a poem" --output-format stream-json --verbose --include-partial-messages \
  | jq -rj 'select(.type == "stream_event" and .event.delta.type? == "text_delta") | .event.delta.text'
```

## Stream event types to watch

### `system/init` (first event)

Fields include `plugins` (loaded successfully) and `plugin_errors`
(load-time errors; affected plugins are demoted and absent from
`plugins`). Fail CI when `plugin_errors` is non-empty.

### `system/plugin_install`

Only emitted when `CLAUDE_CODE_SYNC_PLUGIN_INSTALL` is set. Fires for
each marketplace plugin install before the first turn.

| Field | Values |
|---|---|
| `type` | `"system"` |
| `subtype` | `"plugin_install"` |
| `status` | `"started"`, `"installed"`, `"failed"`, `"completed"` |
| `name` | marketplace name (on `installed` / `failed`) |
| `error` | failure message (on `failed`) |
| `uuid`, `session_id` | identifiers |

### `system/api_retry`

Emitted before a retry; use to surface progress or implement custom
backoff.

| Field | Description |
|---|---|
| `subtype` | `"api_retry"` |
| `attempt` | current attempt number (starting at 1) |
| `max_retries` | total retries permitted |
| `retry_delay_ms` | ms until next attempt |
| `error_status` | HTTP status or `null` for connection errors |
| `error` | `authentication_failed`, `billing_error`, `rate_limit`, `invalid_request`, `server_error`, `max_output_tokens`, `unknown` |
| `uuid`, `session_id` | identifiers |

## Tool approval

```bash
claude -p "Run the test suite and fix any failures" \
  --allowedTools "Bash,Read,Edit"
```

For prefix matching in permission rules, use a trailing ` *`:

```bash
claude -p "Review staged changes and create a commit" \
  --allowedTools "Bash(git diff *),Bash(git log *),Bash(git status *),Bash(git commit *)"
```

The space before `*` matters: `Bash(git diff*)` would also match
`git diff-index`.

## Permission modes

Session-wide baseline:

```bash
--permission-mode acceptEdits    # writes + mkdir/touch/mv/cp auto-approved; other cmds need allowlist
--permission-mode dontAsk        # denies anything outside permissions.allow + read-only set
--permission-mode plan           # propose before editing
```

`dontAsk` is the right default for locked-down CI.

## Session continuity

```bash
claude -p "Review this codebase for perf issues"
claude -p "Now focus on database queries" --continue
claude -p "Generate a summary" --continue

# Or capture the session id:
session_id=$(claude -p "Start a review" --output-format json | jq -r '.session_id')
claude -p "Continue that review" --resume "$session_id"
```

## Interactive-only commands (NOT available in `-p`)

`/commit`, `/plan`, `/plugin`, `/mcp`, `/resume`, other interactive
pickers. **Describe the task** instead.

## Primary use cases in this repo

- Routine setup scripts (`claude -p --bare --settings ... "<task>"`)
- GitHub Actions / GitLab CI steps
- `cron`-driven maintenance
- Any shell script that needs a one-shot, deterministic Claude call

## Next steps

- Agent SDK quickstart: `https://code.claude.com/docs/en/agent-sdk/quickstart`
- CLI reference: `https://code.claude.com/docs/en/cli-reference`
- GitHub Actions: `https://code.claude.com/docs/en/github-actions`
- GitLab CI/CD: `https://code.claude.com/docs/en/gitlab-ci-cd`
