# External references

Canonical sources. Don't duplicate their content here — just point.

## Claude Code CLI

- **npm**: `@anthropic-ai/claude-code`
  - Current pinned release in this repo: **v2.1.114**
  - `npm install -g @anthropic-ai/claude-code@2.1.114`
- **Docs root**: `https://code.claude.com/docs/en/`
- **CLI reference**: `https://code.claude.com/docs/en/cli-reference`

## Agent SDK (formerly Claude Code SDK)

- **TypeScript**: `github.com/anthropics/claude-agent-sdk-typescript`
  - Install: `npm install @anthropic-ai/claude-agent-sdk`
  - CHANGELOG: `/blob/main/CHANGELOG.md`
- **Python**: `github.com/anthropics/claude-agent-sdk-python`
  - Install: `pip install claude-agent-sdk`
- **Example agents**: `github.com/anthropics/claude-agent-sdk-demos`
  — email assistant, research agent, more
- **Docs**: `https://code.claude.com/docs/en/agent-sdk/overview`
- **Opus 4.7 floor**: v0.2.111

## Anthropic Client SDK (`@anthropic-ai/sdk`)

- **Repo**: `github.com/anthropics/anthropic-sdk-typescript`
  - Latest at fetch: **v0.90.0**
  - Install: `npm install @anthropic-ai/sdk`
- **Python equivalent**: `github.com/anthropics/anthropic-sdk-python`
- **API docs**: `https://docs.claude.com/` (API surface) and
  `https://platform.claude.com/docs/en/`

## Plugin marketplaces

- **Official** (auto-available): `claude-plugins-official`
  - Catalog: `https://claude.com/plugins`
  - LSP plugins: `clangd-lsp`, `csharp-lsp`, `gopls-lsp`, `jdtls-lsp`,
    `kotlin-lsp`, `lua-lsp`, `php-lsp`, `pyright-lsp`,
    `rust-analyzer-lsp`, `swift-lsp`, `typescript-lsp`
  - Integrations: `github`, `gitlab`, `atlassian`, `asana`, `linear`,
    `notion`, `figma`, `vercel`, `firebase`, `supabase`, `slack`,
    `sentry`
  - Dev workflows: `commit-commands`, `pr-review-toolkit`,
    `agent-sdk-dev`, `plugin-dev`
  - Output styles: `explanatory-output-style`,
    `learning-output-style`
- **Demo** (`anthropics-claude-code`, add with
  `/plugin marketplace add anthropics/claude-code`):
  `github.com/anthropics/claude-code/tree/main/plugins`
  - Includes: `agent-sdk-dev`, `claude-opus-4-5-migration`,
    `code-review`, `commit-commands`, `explanatory-output-style`,
    `feature-dev`, `frontend-design`, `hookify`,
    `learning-output-style`, `plugin-dev`, `pr-review-toolkit`,
    `ralph-wiggum`, `security-guidance`

## Skills

- **Anthropic Skills repo**: `github.com/anthropics/skills`
  - Top-level: `.claude-plugin/`, `skills/`, `spec/`, `template/`
  - Categories: Creative & Design, Development & Technical,
    Enterprise & Communication, Document Skills
  - Canonical document skills: `docx`, `pdf`, `pptx`, `xlsx`
  - Use as the structural reference when authoring a custom skill
    under `.claude/skills/<name>/`.

## Cookbooks

`github.com/anthropics/claude-cookbooks` — recipe-style notebooks.
Copy a pattern; don't add as a dependency.

Directories:
- `anthropic_cookbook` — core implementations + utilities
- `capabilities` — classification, RAG, summarization
- `claude_agent_sdk` — Agent SDK recipes
- `coding` — code generation patterns
- `extended_thinking` — adaptive / budgeted thinking patterns
- `finetuning` — fine-tuning examples
- `images` — image processing + generation
- `managed_agents` — managed-agent patterns
- `misc` — PDF, JSON mode, moderation, prompt caching
- `multimodal` — vision, charts, forms, sub-agent patterns
- `observability` — monitoring + tracing
- `patterns/agents` — agent design patterns
- `skills` — skill authoring
- `tests` — testing examples
- `third_party` — Pinecone, Wikipedia, Voyage AI integrations
- `tool_use` — customer service agents, calculators, SQL
- `tool_evaluation` — frameworks for evaluating tool effectiveness

## Programmatic advertising library

Reference snapshot lives at `src/advertising/` (outside `src/web/`):
ArXiv PDFs, IAB OpenRTB 2.6 spec, `wnzhang/rtb-papers` README mirror,
and catalog-only pointers for books / blogs / Python + npm packages /
HuggingFace datasets. See `src/advertising/README.md`.

## Docs pages loaded during setup

Every claim in this folder traces back to one of these (see
`sources.md`):

- `/en/web-quickstart`, `/en/claude-code-on-the-web`,
  `/en/remote-control`, `/en/platforms`
- `/en/routines`, `/en/ultraplan`, `/en/ultrareview`
- `/en/context-window`, `/en/claude-directory`, `/en/headless`
- `/en/discover-plugins`, `/en/agent-sdk/overview`
- `github.com/anthropics/{claude-code,skills,claude-cookbooks,anthropic-sdk-typescript}`
- `npmjs.com/package/@anthropic-ai/claude-code/v/2.1.114`
