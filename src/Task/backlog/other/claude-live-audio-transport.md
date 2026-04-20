---
title: Swap Gemini Live for a Claude live-audio transport when one ships
status: watching
opened: 2026-04-20
---

## why

`src/live/voice-chat/` uses Gemini Live because Claude's Messages
API does not currently expose a bidirectional audio WebSocket.
`ask_claude` bridges hard subturns but the primary transport is
Google's. If Anthropic ships a live audio endpoint (or if the
Agent SDK gains a `query.audio()` equivalent), we want to swap it
in on the same code-execute-evaluate loop — the loop itself does
not change, only the transport layer.

## scope

- In: a `transports/` subfolder inside `voice-chat/` with
  `gemini.js` and `claude.js` sharing a common interface
  (`connect`, `sendAudio`, `onMessage`, `sendToolResponse`).
- In: a dropdown on the page to flip transports.
- In: eval cases that assert each transport's ephemeral-token
  endpoint refuses without its respective env var.
- Out: any work here before the Claude live audio transport is
  actually published and reachable from the browser.

## test recipe

Only runnable once Claude ships the transport. Until then this
file is a placeholder so we notice the moment it becomes
actionable.

## blockers / open questions

- Watching: `code.claude.com/docs` for anything tagged "live",
  "realtime", or "audio". Check monthly.
- Watching: `@anthropic-ai/claude-agent-sdk` CHANGELOG for new
  query modes.
