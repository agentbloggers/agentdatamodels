# skill-evals

Evaluating skills — the on-demand loadable workflow packages.

## What makes a good skill

- **Single purpose**, nameable in one phrase (`security-review`,
  `commit-push-pr`).
- **Discoverable** — description starts with "Use when…" so Claude's
  classifier matches it to user prompts.
- **Self-contained** — includes supporting files next to `SKILL.md`
  so the skill doesn't depend on repo state.
- **Observable** — tells Claude what to say when it's activated so
  the user sees which skill is running.

## Shape

```
.claude/skills/security-review/
├── SKILL.md
├── checklist.md
└── scripts/
    └── scan.sh
```

`SKILL.md` frontmatter:
```yaml
---
name: security-review
description: Use when reviewing code for security vulnerabilities in the pending diff on the current branch.
---
```

Body = instructions. Treat like a single long tool-use prompt.

## Evals

Run with vs without the skill invoked, same seed prompt:

```bash
# Without
claude -p --bare "Check the auth module for security issues" \
  --output-format json > out-no-skill.json

# With (preload via subagent)
claude -p --bare "Use the security-review skill on the auth module" \
  --output-format json > out-with-skill.json

# Compare
diff <(jq -r .result out-no-skill.json) <(jq -r .result out-with-skill.json)
```

## Metrics

| Metric | Target |
|---|---|
| Activation rate | Skill runs when it should, not when it shouldn't |
| Output stability | Same prompt → similar output across runs |
| Token cost | Skill body shouldn't grow > 2K tokens |
| Downstream pass rate | Skill outputs actually lead to fixes |

## Directives

- Skills ≠ rules. Skills load on demand; rules are always-on.
- Prefer skills for anything > 100 lines of guidance.
- Do not duplicate `CLAUDE.md` content inside a skill — if Claude's
  already read `CLAUDE.md`, repeating it wastes tokens.

## Source

`/en/skills`, `/en/agent-sdk/skills`,
`github.com/anthropics/skills`
