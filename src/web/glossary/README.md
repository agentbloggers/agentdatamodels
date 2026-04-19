# glossary

Terms of art in the Claude Code ecosystem, pinned to v2.1.114 / Agent
SDK v0.2.111+.

## A

- **Agent tool** — successor name to `Task` (renamed v2.1.63). How
  subagents are invoked. Still accepts `Task` as alias.
- **Agent SDK** — `@anthropic-ai/claude-agent-sdk` (formerly Claude
  Code SDK). The library surface that runs Claude Code's agent loop
  programmatically.
- **Agent teams** — multiple agents coordinating across separate
  sessions (distinct from subagents, which are intra-session).
- **auto memory** — `MEMORY.md` in `~/.claude/projects/<repo>/memory/`
  that Claude writes to itself; first 200 lines / 25KB auto-load.
- **auto-fix PR** — `/autofix-pr` enables Claude to watch a PR and
  fix CI failures + review comments.

## B

- **bare mode** — `claude -p --bare`. Skips auto-discovery of hooks,
  skills, plugins, MCP servers, memory, and `CLAUDE.md`.

## C

- **channels** — mobile / chat-bridge integrations (Slack, Telegram,
  Discord, iMessage).
- **claude.ai/code** — the web surface; spawns cloud VM sessions.
- **claude-plugin** — marketplace manifest format
  (`.claude-plugin/marketplace.json`).
- **cloud session** — ephemeral VM running claude-code at
  claude.ai/code.
- **compaction** — summarizing conversation to free context. Triggered
  by `/compact`, `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, or natural limits.

## D

- **Dispatch** — message-a-task from Claude mobile app → paired Desktop.
- **dontAsk** — permission mode that denies anything outside
  `permissions.allow` or the read-only command set.

## E

- **effort** — nested under `output_config`; Opus levels `low|medium|high|xhigh|max`.

## F

- **`/fire`** — Routines HTTP trigger endpoint.

## H

- **hooks** — shell commands fired on lifecycle events (`PreToolUse`,
  `PostToolUse`, `Stop`, `SessionStart`, `SessionEnd`,
  `UserPromptSubmit`, `InstructionsLoaded`, `SubagentStart`,
  `SubagentStop`).

## I

- **isolation** — subagent frontmatter field; `worktree` runs the
  subagent in a temp git worktree.

## L

- **llms.txt** — `code.claude.com/docs/llms.txt` — index of all doc
  URLs suitable for model consumption.

## M

- **MCP** — Model Context Protocol; tool servers for Claude.
- **managed agents** — beta product; server-managed agents with
  per-session sandboxed containers. Beta: `managed-agents-2026-04-01`.

## O

- **Opus 4.7** — current default Opus model (`claude-opus-4-7`).
  Thinking is `adaptive`-only; no `temperature` / `top_p` / `top_k`.

## P

- **permissionMode** — `default|acceptEdits|auto|dontAsk|bypassPermissions|plan`.
- **plan mode** — read-only exploration that proposes a plan via
  `ExitPlanMode`.

## R

- **Remote Control** — drive a local CLI session from web/mobile.
- **Routines** — saved cloud-session configs triggered by
  schedule/API/GitHub events.

## S

- **settingSources** — Agent SDK option restricting which `.claude/`
  sources to load.
- **skills** — `.claude/skills/<name>/SKILL.md`. Same `/name`
  invocation as legacy commands; can bundle files.
- **stream-json** — newline-delimited JSON events from `claude -p`.
- **subagent** — separate agent instance within the same session;
  runs in own context window, returns only final message.
- **`SKILL.md`** — skill definition file (YAML frontmatter + markdown).

## T

- **`Task`** — former name of Agent tool. Kept as alias.
- **teleport** — `--teleport` / `/teleport` / `/tp` pulls a cloud
  session down locally.

## U

- **ultraplan** — long-form plan drafted on the web.
- **ultrareview** — multi-agent cloud review; explicit invocation
  only.

## V

- **version floor (SDK / CLI)** — minimum version where a feature
  works. See `primitives.md`.

## W

- **worktree** — git worktree; `isolation: worktree` gives a subagent
  an isolated copy of the repo.

## Source

`/en/sub-agents`, `/en/routines`, `/en/memory`, `/en/agent-sdk/*`,
`/en/headless`, `/en/ultraplan`, `/en/ultrareview`
