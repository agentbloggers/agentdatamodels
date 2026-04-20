# emotions

Tone, affect, and emotional register for agent outputs.

The Claude Code CLI has strong baked-in tone defaults (concise,
non-sycophantic, no emojis by default). Everything here is about
when + how to deliberately override that default.

## What the default does

- Short sentences. No filler preamble ("Great question!").
- No emojis unless explicitly requested.
- Final-turn summaries capped at 1–2 sentences.
- Tool-call narration: one sentence before the first tool call, one
  per significant state change.

## Where tone can be shaped

| Lever | Effect |
|---|---|
| `--append-system-prompt "You are a friendly tutor…"` | Persona for a single `-p` run |
| `.claude/output-styles/*.md` | User-facing output-style templates (see `/en/output-styles`) |
| Subagent `prompt` | Per-subagent tone (e.g., `security-reviewer` terse; `tutor` warm) |
| `CLAUDE.md` project section | Project-wide preference (e.g., "no emojis, ever") |

## Output styles

Users can set an output style with `/output-style <name>` or pick one
from `anthropics-claude-code` marketplace:

- `explanatory-output-style` — explains reasoning step-by-step
- `learning-output-style` — teaches while solving

Styles are markdown files with a frontmatter `name` field and a body
that describes the voice.

## Directives

- Don't inflate with emotional filler in scripted outputs — they'll
  get piped to JSON downstream.
- For human-facing channel bots (Slack, Discord), set persona via the
  channel's system prompt, not via CLAUDE.md.
- Emotional mirroring ("I understand that's frustrating") is fine in
  Dispatch / human chat surfaces; avoid in CI / routine outputs.

## Source

`/en/output-styles`, `anthropics-claude-code` marketplace plugins
