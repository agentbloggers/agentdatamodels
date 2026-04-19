# alignment

Safety, security review, permission enforcement — how to keep an
agent-driven workflow from doing dumb / dangerous things.

## Permission modes

| Mode | Effect |
|---|---|
| `default` | Standard prompts |
| `acceptEdits` | Auto-accept file edits + common FS commands; writes to `.git`, `.claude`, `.vscode`, `.idea`, `.husky` still prompt |
| `auto` | Background classifier reviews each command |
| `dontAsk` | Deny anything outside `permissions.allow` + read-only set |
| `bypassPermissions` | Skip prompts — protected dirs still prompt |
| `plan` | Read-only exploration |

Parent session's mode takes precedence over subagent mode for
`bypassPermissions`, `acceptEdits`, and `auto`.

## Permission rules

`.claude/settings.json`:

```json
{
  "permissions": {
    "allow": ["Bash(npm test)", "Bash(git diff *)"],
    "deny": ["Bash(rm -rf *)", "Agent(Explore)", "Read(//etc/**)"]
  }
}
```

Prefix match: trailing ` *` (note the space) — `Bash(git diff *)`
matches `git diff HEAD` but not `git diff-index`.

## Security review

- `/security-review` is a skill that reviews pending changes on the
  current branch. Run before merging changes that touch auth / crypto
  / network / user input.
- For full PR review, use `/ultrareview [PR#]` (cloud sandbox, billed
  as extra usage after 3 free runs).

## Directives

- **Never** run `rm -rf` or `git reset --hard` in `dontAsk` /
  `bypassPermissions` sessions without a durable allowlist.
- **Never** commit secrets. Cloud routines use per-environment env
  vars, not committed files.
- **Always** scope `.claude/settings.json` permissions to the
  narrowest useful set. `Bash(*)` is almost never correct.
- In agents that run on user PR comments (auto-fix-pr), assume the
  commenter might be hostile — don't let the bot run code referenced
  in a PR body without review.
- `bypassPermissions` in a subagent still prompts on writes to
  `.git`, `.claude`, `.vscode`, `.idea`, `.husky` — except for
  `.claude/commands`, `.claude/agents`, `.claude/skills`.

## Source

`/en/permissions`, `/en/permission-modes`, `/en/security`,
`/en/security-review`, `/en/sandboxing`
