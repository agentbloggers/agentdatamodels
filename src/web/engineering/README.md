# engineering

Engineering practice notes — what to do *within* a session for the
kind of work this repo exists to produce.

## Best-practice primitives (per `/en/best-practices`)

- **Plan before implementing** for tasks > 15 min. Use `/plan` or
  `/ultraplan`, not "just start coding."
- **Commit small units**. One logical change per commit. Plumb the
  session URL into the commit footer.
- **Read before edit**. Every file touched gets a `Read` call first —
  this is also enforced by the `Edit` tool.
- **Delegate to subagents for exploration**. Keep grep storms out of
  the main conversation's context window.
- **Run tests**. If a script changes code, run the test command
  mentioned in `CLAUDE.md` before reporting "done."

## Tool preferences

| Task | Preferred | Avoid |
|---|---|---|
| Find file by name | `Glob` | `Bash find` |
| Find text | `Grep` | `Bash grep/rg` |
| Read file | `Read` | `Bash cat/head/tail` |
| Edit file | `Edit` | `Bash sed/awk` |
| Write new file | `Write` | `Bash echo > file` |
| Output to user | direct text | `Bash echo` |

## Commit etiquette

- Don't amend. Always create a new commit. When a pre-commit hook
  fails, fix and commit again — the aborted commit didn't happen, so
  `--amend` would modify the *previous* commit.
- `git add <file>` > `git add -A` (avoids accidentally staging
  secrets or binaries).
- Commit messages: 1–2 sentences, focus on *why*, followed by the
  session backlink.

## Directives

- Don't add features, refactors, or abstractions the task didn't
  ask for.
- Don't add error handling for scenarios that can't happen.
- Don't write multi-paragraph docstrings. Default to zero comments
  unless the *why* is non-obvious.
- UI/frontend changes: test in a browser before reporting done.
- Never skip hooks (`--no-verify`) unless explicitly asked.

## Source

`/en/best-practices`, `/en/common-workflows`,
`/en/how-claude-code-works`
