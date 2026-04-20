# memory

Claude Code's two memory systems, per `/en/memory` on v2.1.114.

## CLAUDE.md vs auto memory

|  | CLAUDE.md | Auto memory |
|---|---|---|
| Who writes it | You | Claude |
| Contains | Instructions, rules | Learnings, patterns |
| Scope | Project / user / managed / local | Per working tree |
| Loaded into | Every session | Every session (first 200 lines or 25KB) |

## CLAUDE.md locations (precedence: most specific wins)

| Scope | Path | Shared with |
|---|---|---|
| Managed policy | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS), `/etc/claude-code/CLAUDE.md` (Linux/WSL), `C:\Program Files\ClaudeCode\CLAUDE.md` (Windows) | all users in org |
| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | team, via git |
| User | `~/.claude/CLAUDE.md` | just you, all projects |
| Local | `./CLAUDE.local.md` (gitignored) | just you, this project |

Files are **concatenated** not overridden — `CLAUDE.local.md` appends
after `CLAUDE.md` at the same level.

## Load order

Claude walks up from cwd collecting `CLAUDE.md` + `CLAUDE.local.md` at
each level. Files below cwd load on demand when Claude reads files
there. Block-level HTML comments `<!-- like this -->` are stripped
before injection.

## Imports

```markdown
See @README for project overview and @package.json for commands.

# Individual Preferences
- @~/.claude/my-project-instructions.md
```

Max recursion depth: 5. First time an external import is seen, Claude
prompts for approval.

## `.claude/rules/`

Topic-scoped instruction files. Always-on unless a `paths:`
frontmatter narrows them.

```markdown
---
paths:
  - "src/**/*.{ts,tsx}"
  - "lib/**/*.ts"
---

# API rules
```

## Auto memory

- **Default on** (v2.1.59+). Toggle with `autoMemoryEnabled: false`
  or `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`.
- Stored at `~/.claude/projects/<project>/memory/`. Override with
  `autoMemoryDirectory` (user/local scope only — NOT project).
- `MEMORY.md` is the index; first 200 lines / 25KB auto-load.
  Claude moves detail into topic files (`debugging.md` etc.) which
  load on demand.
- Machine-local — not shared across machines or cloud environments.

## Subagent memory

`memory:` frontmatter field enables persistent cross-session memory
per subagent:

| Scope | Directory |
|---|---|
| `user` | `~/.claude/agent-memory/<name>/` |
| `project` | `.claude/agent-memory/<name>/` |
| `local` | `.claude/agent-memory-local/<name>/` |

When memory is enabled the subagent's system prompt includes read/write
instructions + the first 200 lines / 25KB of its `MEMORY.md`, and
`Read`/`Write`/`Edit` tools auto-enable.

## Directives

- Target `CLAUDE.md` < 200 lines. Offload to `.claude/rules/` or
  `src/web/` with `@` imports.
- Use `local` / `CLAUDE.local.md` for sandbox URLs + personal data.
- Use `project` memory scope for subagents whose learnings should be
  shared via version control.
- Run `/memory` to audit what's loaded.
- `InstructionsLoaded` hook logs which files loaded and when — good
  for debugging path-specific rules.

## Source

`/en/memory`, `/en/sub-agents#enable-persistent-memory`,
`/en/context-window#what-survives-compaction`
