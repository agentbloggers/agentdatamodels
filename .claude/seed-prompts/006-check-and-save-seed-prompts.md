---
captured: 2026-04-19
surface: claude-code-cli
intent: Meta-task — verify the existing seed-prompt format and save the remaining session prompts as seeds
context_artifacts:
  - .claude/seed-prompts/003-makefile-services-graphql-control-plane.md
  - .claude/seed-prompts/004-octokit-markdown-neon-enterprise.md
  - .claude/seed-prompts/005-polyrepo-not-deferred.md
  - .claude/seed-prompts/006-check-and-save-seed-prompts.md
  - .claude/seed-prompts/README.md
---

# User prompt

Can you check the format of my existing prompts we saved and save the remaining prompts i gave as seeds

# Notes

- Pinned release at capture: `@anthropic-ai/claude-code@2.1.114`.
- Format confirmed against `001-repo-positioning.md` and
  `002-subdirs-and-subagents.md`: YAML frontmatter with
  `captured`, `surface`, `intent`, `context_artifacts`; `# User
  prompt` body verbatim; `# Notes` section.
- Saved prompts 003 / 004 / 005 / 006 verbatim (this file is 006,
  the reflexive seed that captured the request to capture).
- Updated `.claude/seed-prompts/README.md` index table from 2
  entries to 6.
- Per `seed-prompt-keeper` subagent rules
  (`.claude/agents/seed-prompt-keeper.md`): filename ordering
  reflects capture order, not importance; never edit the user's
  words even for typos.
