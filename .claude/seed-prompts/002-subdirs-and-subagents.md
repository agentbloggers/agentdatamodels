---
captured: 2026-04-19
surface: claude-code-cli
intent: Scaffold project-scope plugin directory, 29 topic subdirs under src/web/, GitHub GraphQL tooling, internal subagent system with memory persistence, and seed prompt corpus
context_artifacts:
  - .claude-plugins/
  - .claude/agents/*.md
  - .claude/skills/github-graphql/SKILL.md
  - .claude/seed-prompts/
  - .mcp.json
  - src/web/{sessions,tools,tasks,connectors,memory,cookbook,glossary,system-prompts,emotions,engineering,alignment,opus-47,xml,sitemap-xml,llms-txt,llms-full-txt,platform-api,platform-sdk,terminal-cli,context-evals,prompt-evals,memory-evals,skill-evals,mcp-evals,tool-evals,lsp,codeintelligence,todos,subtasks}/README.md
---

# User prompt

i want you to just write the code and mkdir at the project scope
`.claude-plugins/` so we have the plugins installed at a project
level. I want you to properly document the primitives and directives
as of the pinned clause-code CLI npm version . Mkdir src/web/sessions,
src/web/tools, src/web/tasks, src/web/connectors, src/web/memory,
src/web/cookbook, src/web/glossary, src/web/system-prompts,
src/web/emotions, src/web/engineering, src/web/alignment,
src/web/opus-47, src/web/xml, src/web/sitemap-xml, src/web/llms-txt,
src/web/llms-full-txt, src/web/platform-api, src/web/platform-sdk,
src/web/terminal-cli, src/web/context-evals, src/web/prompt-evals,
src/web/memory-evals, src/web/skill-evals, src/web/mcp-evals,
src/web/tool-evals, src/web/lsp, src/web/codeintelligence,
src/web/todos, src/web/subtasks . Install GitHub graphql advanced
tools and system up an an internal subagent system with
`code.claude.com/docs/llms.txt` reference of markdown files to get the
detailed yaml frontmatter structure of subagent design and enabling
subagent memory persistence . Also save the user prompts from this
session as seed prompts for the project

# Notes

- Pinned release at capture: `@anthropic-ai/claude-code@2.1.114`,
  Agent SDK floor `v0.2.111+`.
- Created 29 topic subdirs under `src/web/`, each with a scoped
  `README.md` of primitives + directives.
- Configured `.claude-plugins/` as vendoring dir (empty by default;
  populated only when a plugin can't live on a marketplace).
- Installed GitHub GraphQL tooling three ways: `gh api graphql`,
  `@octokit/graphql` from scripts, and the
  `@modelcontextprotocol/server-github` MCP server in `.mcp.json`.
- Internal subagent roster: `docs-librarian`,
  `routine-builder`, `plugin-integrator`, `eval-runner`,
  `seed-prompt-keeper`, `benchmark-author` — all with
  `memory: project`.
- Reference: `https://code.claude.com/docs/llms.txt` (150 URLs),
  `/en/sub-agents` for frontmatter, `/en/memory` for memory semantics.
