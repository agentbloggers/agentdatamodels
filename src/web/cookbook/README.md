# cookbook

Patterns from `github.com/anthropics/claude-cookbooks`. Recipe-style
notebooks — copy what fits, don't add the cookbook as a dependency.

## Directories

| Directory | When to consult |
|---|---|
| `anthropic_cookbook` | Core Messages API + utilities |
| `capabilities` | Classification, RAG, summarization, sub-agents |
| `claude_agent_sdk` | Agent SDK recipes (TS + Python) |
| `coding` | Code generation patterns |
| `extended_thinking` | Adaptive / budgeted thinking on Opus 4.7 / 4.6 |
| `finetuning` | Fine-tuning examples |
| `images` | Vision + generation |
| `managed_agents` | Managed-agent product patterns |
| `misc` | PDF, JSON mode, moderation, prompt caching |
| `multimodal` | Vision, charts, forms, sub-agent patterns |
| `observability` | Monitoring + tracing |
| `patterns/agents` | Agent design patterns |
| `skills` | Skill authoring reference |
| `tests` | Testing examples |
| `third_party` | Pinecone, Wikipedia, Voyage AI integrations |
| `tool_use` | Customer service agents, calculators, SQL |
| `tool_evaluation` | Frameworks for evaluating tool effectiveness |

## Directives

- Cookbook code is **reference**, not library — version drifts. Copy
  the pattern, re-check model IDs and betas against `primitives.md`.
- For Anthropic SDK patterns, the cookbook often leads the SDK
  CHANGELOG by a release — always cross-check with
  `github.com/anthropics/anthropic-sdk-typescript`.

## Anthropic Skills repo

`github.com/anthropics/skills` is the structural reference for
authoring a skill. Shape:

```
skill-name/
├── SKILL.md            # YAML frontmatter + markdown body
└── (any supporting files)
```
