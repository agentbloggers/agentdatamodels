# prompt-evals

Evaluating prompts — agentic, not classifier-style.

## Three shapes of prompt eval

| Shape | What it answers |
|---|---|
| **Pass/fail rubric** | Did the agent produce the right artifact? |
| **Judge model** | A second Claude call scores the first's output |
| **Golden trace diff** | Does the tool-call sequence match a known-good trace? |

## Cheapest harness

```bash
# One seed prompt, one expected outcome
session_id=$(claude -p --bare "Fix the off-by-one in src/utils.ts" \
  --output-format json | jq -r .session_id)

# Grade with a second invocation
claude -p --bare "Did the previous session fix the off-by-one?" \
  --resume "$session_id" --output-format json \
  --json-schema '{"type":"object","properties":{"pass":{"type":"boolean"},"reason":{"type":"string"}},"required":["pass","reason"]}' \
  | jq '.structured_output'
```

## What to vary per run

- Model (`claude-opus-4-7` vs `claude-sonnet-4-6` vs `claude-haiku-4-5`)
- `permissionMode` (`plan` vs `acceptEdits`)
- Tool allowlist
- `CLAUDE.md` presence (`--bare` vs default)
- `--append-system-prompt` content

## Metrics

| Metric | Captured via |
|---|---|
| Success rate | Judge model + manual spot-check |
| Latency (p50/p95) | `time claude -p …` |
| Tokens (input/output/cache) | `.usage` in JSON output |
| Tool-call count | `.usage.server_tool_use` or stream-json event count |
| Retry count | `system/api_retry` events |

## Directives

- Seed prompts live at `.claude/seed-prompts/` — version-control them
  with the repo.
- Re-run evals whenever `CLAUDE.md`, `.claude/rules/`, or
  `.claude/skills/` changes materially. Context changes prompt
  behavior.
- Keep the eval corpus small (5–20 prompts). Large corpora are cheap
  to create and expensive to keep truthful.

## Source

Anthropic `claude-cookbooks/tool_evaluation/`,
`/en/agent-sdk/structured-outputs`
