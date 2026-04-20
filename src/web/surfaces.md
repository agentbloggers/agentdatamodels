# Surfaces

Same engine, different surfaces. Use this to pick the right one for a
workflow.

## Where Claude Code runs

| Surface | Code runs on | Chat from | Local config? | Needs GitHub? | Keeps running if disconnected? | Permission modes | Network scope |
|---|---|---|---|---|---|---|---|
| **CLI** | your machine | your terminal | yes | no | no | all modes | your machine's network |
| **Desktop** | your machine or cloud VM | Desktop UI | yes (local) / no (cloud) | cloud sessions only | depends on session type | depends | depends |
| **VS Code** | your machine | editor | yes | no | no | all modes | your machine's |
| **JetBrains** | your machine | IDE | yes | no | no | all modes | your machine's |
| **Web (claude.ai/code)** | Anthropic cloud VM | browser / mobile app | no (repo only) | yes, **or** `--remote` bundle | yes | `Auto accept edits`, `Plan` | configurable per environment |
| **Remote Control** | your machine | browser / mobile app | yes (local) | no | while local terminal stays open | `Ask`, `Auto accept edits`, `Plan` | your machine's |
| **Mobile** | depends (local via RC / Dispatch, or cloud) | Claude iOS/Android | depends | depends | depends | depends | depends |

## Remote-access trigger matrix

How to reach a running Claude Code session while you're away:

| Method | Trigger | Claude runs on | Setup | Best for |
|---|---|---|---|---|
| **Dispatch** | Message from Claude mobile app | Your machine (Desktop) | Pair mobile app with Desktop | Delegating work while away, minimal setup |
| **Remote Control** | Drive from claude.ai/code or mobile | Your machine (CLI or VS Code) | `claude remote-control` | Steering in-progress work from another device |
| **Channels** | Push from Telegram, Discord, iMessage, or own server | Your machine (CLI) | Install a channel plugin or build your own | Reacting to external events (CI failures, chat) |
| **Slack** | Mention `@Claude` in a team channel | Anthropic cloud | Install the Slack app with cloud enabled | PRs / reviews from team chat |
| **Scheduled tasks / Routines** | Schedule, HTTP POST, or GitHub event | CLI / Desktop / cloud | Pick a frequency or a trigger type | Recurring automation, deploy verification |

## "I want to…" → surface

| If you want to… | Pick |
|---|---|
| Steer an in-progress local task from your phone | Remote Control |
| Kick off a task on a repo you don't have checked out | Web (`--remote` or `claude.ai/code`) |
| Run many independent tasks in parallel | Web (one cloud session each) |
| Run nightly/weekly automation | Routines (cloud) or Desktop scheduled tasks |
| React to every new PR with a review | Routine with GitHub trigger on `pull_request.opened` |
| Review a substantial change before merge | `/ultrareview` |
| Plan a complex refactor with inline comments before implementation | `/ultraplan` |
| Run Claude from CI | `claude -p --bare` |
| Run Claude from a Routine setup script | `claude -p --bare` + `--settings` and `--mcp-config` |
| Dispatch a task from phone to your Mac | Dispatch (needs Desktop paired) |
| Generate a PR without any local setup | Web (prefilled URL) or Slack |

## Surface-specific gotchas

- **CLI-only**: `/login`, `/web-setup`, `/mcp`, `/plugin`, `/resume`,
  `--teleport`, `claude remote-control` server mode, the Agent SDK in
  general.
- **Web-only** (not available in CLI / RC): the `claude.ai/code`
  diff viewer with inline comments, the review-view plan UI for
  `/ultraplan`.
- **Not available in cloud**: `Ask` permission mode, `Auto` mode,
  `Bypass permissions`, `/model`, `/config` (interactive pickers),
  `/clear` (start a new session instead).
- **Not available to ZDR orgs**: `/web-setup`, all cloud-session
  features, `/ultrareview`.
- **Not available on Bedrock / Vertex / Foundry**: Managed Agents,
  `/ultrareview`, claude.ai login for Agent SDK products.
