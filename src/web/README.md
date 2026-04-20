# `src/web/` — workflow primitives & directives

Reference material for **driving `claude-code` from outside the
terminal**. Load these files on demand when your task touches Claude
Code on the web, Remote Control, Routines, Dispatch, scheduled tasks,
ultraplan, ultrareview, the Agent SDK, or the `@anthropic-ai/sdk`
Messages API.

Claude Code on the web and every feature referenced here is in
**research preview** — behavior, CLI flags, and beta headers change.
Cross-check against `sources.md` if something looks off.

## Files

| File | Load when… |
|---|---|
| `primitives.md` | You need a command name, CLI flag, env var, URL, or endpoint |
| `directives.md` | You're writing code that runs in a cloud / RC / routine context and need the conduct rules |
| `surfaces.md` | You're deciding which surface (CLI vs Web vs Dispatch vs RC) fits a workflow |
| `plugins.md` | You're adding/removing a plugin, or debugging marketplace / scope issues |
| `agent-sdk.md` | You're using `@anthropic-ai/claude-agent-sdk` / `claude-agent-sdk` |
| `sdk.md` | You're using `@anthropic-ai/sdk` directly against the Messages API |
| `headless.md` | You need `claude -p` / `--bare` for CI, a routine setup script, or a scripted call |
| `context-window.md` | You're auditing what auto-loads or tuning for a long-running session |
| `claude-dir.md` | You're adding anything under `.claude/` or asking whether a file travels to cloud sessions |
| `references.md` | You want the canonical GitHub / npm links (cookbooks, skills, SDK repos) |
| `sources.md` | You want to verify a claim or note the version floor on a feature |

Adjacent knowledge areas:

- `../live/` — realtime voice / video / avatar surfaces. The first demo
  is `../live/voice-chat/`, a browser page that wires a Gemini Live
  WebSocket to a code-execute-evaluate loop and optional Anam / HeyGen
  avatar. Claude's Messages API still fronts the heavy reasoning via an
  `ask_claude` tool — see `../live/voice-chat/gemini-live.md` for the
  split.

## How to use

- These are reference cards, not prose. Read the one relevant file, not
  all of them.
- Preserve exact names: every command / flag / env var / URL / header /
  endpoint is copied verbatim from the source docs. Don't paraphrase
  when quoting back to the user.
- If a claim here conflicts with the live docs at `code.claude.com`,
  the live docs win — update this folder in the same commit.
