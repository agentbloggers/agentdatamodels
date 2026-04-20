---
captured: 2026-04-19
surface: claude-code-cli
intent: Set repo positioning — workflow builder for claude-code outside terminal; create CLAUDE.md + src/web/ reference pack
context_artifacts:
  - CLAUDE.md
  - src/web/README.md
  - src/web/primitives.md
  - src/web/directives.md
  - src/web/surfaces.md
  - src/web/plugins.md
  - src/web/agent-sdk.md
  - src/web/sdk.md
  - src/web/headless.md
  - src/web/context-window.md
  - src/web/claude-dir.md
  - src/web/references.md
  - src/web/sources.md
  - .claude/settings.json
---

# User prompt

I want you to update CLAUDE.md to make it explicitly clear that this
repo is optimized for a developer building workflows to use the
claude-code CLI using it's non-terminal features like dispatch,
routines, scheduled tasks, and prompts. Also fetch and understand
these three new URLs and add them to the plan:

- `https://code.claude.com/docs/en/context-window`
- `https://code.claude.com/docs/en/claude-directory`
- `https://code.claude.com/docs/en/headless`

# Notes

- Pinned release at capture: `@anthropic-ai/claude-code@2.1.114`.
- Produced commit `2e085e3` on branch
  `claude/implement-benchmark-dashboard-UnKKn`.
- Established the pattern: `CLAUDE.md` stays short, detail lives
  under `src/web/`.
