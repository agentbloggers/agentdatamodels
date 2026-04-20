# platform-api

Anthropic platform Messages API — the HTTP surface underneath every
SDK.

## Endpoints (stable)

| Endpoint | Purpose |
|---|---|
| `POST /v1/messages` | Create a message |
| `POST /v1/messages/count_tokens` | Count tokens for a request |
| `GET /v1/models` | List models |
| `GET /v1/models/{model_id}` | Model details |
| `POST /v1/messages/batches` | Batch create (50% of list price) |
| `GET /v1/messages/batches/{id}` | Batch status |
| `POST /v1/files` | Upload file for multimodal |
| `GET /v1/files/{id}` | File metadata |
| `DELETE /v1/files/{id}` | Delete file |
| `GET /v1/files/{id}/content` | File bytes |

## Headers

| Header | Value |
|---|---|
| `anthropic-version` | `2023-06-01` |
| `x-api-key` | `sk-ant-…` |
| `anthropic-beta` | Comma-separated beta flags (e.g. `managed-agents-2026-04-01,compact-2026-01-12,task-budgets-2026-03-13,skills-2025-10-02,files-api-2025-04-14,context-1m-2025-08-07`) |

## Beta headers we care about

| Header | Unlocks |
|---|---|
| `context-1m-2025-08-07` | 1M context on Opus 4.7 / Sonnet 4.6 / Opus 4.6 |
| `skills-2025-10-02` | `/v1/skills` API |
| `files-api-2025-04-14` | `/v1/files` |
| `compact-2026-01-12` | Server-side compaction (`context_management.edits`) |
| `task-budgets-2026-03-13` | Per-turn token budgets on Opus 4.7 |
| `managed-agents-2026-04-01` | Managed Agents API |
| `experimental-cc-routine-2026-04-01` | Claude Code Routines `/fire` |

## Auth

- `ANTHROPIC_API_KEY` for direct API.
- `CLAUDE_CODE_USE_BEDROCK=1` + AWS creds for Amazon Bedrock.
- `CLAUDE_CODE_USE_VERTEX=1` + Google creds for Vertex AI.
- `CLAUDE_CODE_USE_FOUNDRY=1` + Azure creds for Microsoft Foundry.

## Directives

- Default to `claude-opus-4-7` for model selection.
- Beta headers accumulate — use a comma-separated list.
- Files API max upload is ~500MB; inline base64 for small images is
  often simpler.
- Batch API is 50% off list price for non-urgent jobs.

## Source

`docs.claude.com/en/api/*`, Anthropic TS SDK
(`github.com/anthropics/anthropic-sdk-typescript`)
