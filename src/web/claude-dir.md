# `.claude/` directory

Where Claude Code reads project config. Two roots:

- **Repo `.claude/`** — travels with the repo, visible to cloud
  sessions.
- **`~/.claude/`** — user-scope, machine-local. Does **NOT** travel to
  cloud sessions.

Anything a workflow needs in the cloud must be in the repo.

## Layout (repo)

| Path | Purpose | Auto-loaded? |
|---|---|---|
| `CLAUDE.md` (repo root) | Project memory. Loaded every session. | ✅ every session |
| `.claude/settings.json` | Project settings: `enabledPlugins`, `hooks`, `permissions`, `extraKnownMarketplaces`. Check into git. | on session start |
| `.claude/settings.local.json` | Per-user overrides (e.g. `apiKeyHelper`, local permissions). Gitignore. | on session start |
| `.claude/skills/<name>/SKILL.md` | Skills (new preferred way). `/name` invocation, plus supporting files. | on demand |
| `.claude/commands/<name>.md` | Legacy slash commands. Same `/name` mechanism as skills — prefer `skills/` for new work. | on demand |
| `.claude/agents/<name>.md` | Custom subagents Claude can delegate to via the `Agent` tool. | on demand |
| `.claude/rules/<name>.md` | Always-loaded instruction files. **Budget item** — adds to every session's context. | ✅ every session |
| `.claude/hooks/…` | Hook scripts referenced from `.claude/settings.json` under `hooks`. The scripts can live anywhere the `command` points; `.claude/hooks/` is convention. | when hook fires |
| `MEMORY.md` or `.claude/MEMORY.md` | Auto-memory Claude writes to itself across sessions. First 200 lines / 25KB auto-loaded. | ✅ every session |
| `.mcp.json` (repo root) | Project-scoped MCP servers. | on session start |

## Layout (`~/.claude/`)

| Path | Purpose | Cloud sees? |
|---|---|---|
| `~/.claude/CLAUDE.md` | Personal cross-project instructions | ❌ |
| `~/.claude/settings.json` | User settings (`enabledPlugins` user-scope, etc.) | ❌ |
| `~/.claude/skills/`, `~/.claude/agents/`, `~/.claude/commands/` | User-level skills/agents/commands | ❌ |
| `~/.claude/backups/`, `projects/`, `sessions/`, `shell-snapshots/` | CLI runtime state | ❌ |

## Cloud-visibility summary

| File | Cloud session sees it? | Why |
|---|---|---|
| `CLAUDE.md` | ✅ | in the repo clone |
| `.claude/settings.json` | ✅ | in the repo clone |
| `.claude/{skills,commands,agents,rules,hooks}/` | ✅ | in the repo |
| `.claude/settings.local.json` | ❌ | gitignored by convention |
| `.mcp.json` | ✅ | in the repo |
| `~/.claude/CLAUDE.md` | ❌ | user-scope, machine-local |
| `~/.claude/settings.json` | ❌ | user-scope |
| `claude mcp add` entries | ❌ | written to user config |

## Directives

- **Commit what cloud sessions need.** MCP servers go in
  `.mcp.json`, plugins in `.claude/settings.json` (`enabledPlugins`),
  hooks in `.claude/settings.json` + their scripts.
- **Keep `.claude/rules/` small.** Rule files are always-on — they
  add to every session's context. Put rules that only matter sometimes
  into a skill instead.
- **Prefer skills over commands.** `commands/` works but is legacy.
  Skills can bundle supporting files (templates, reference docs) and
  use the same `/name` invocation.
- **Use `.claude/settings.local.json` for personal overrides.** Never
  check in API keys, local paths, personal plugin enablement.
- **MCP server config belongs in `.mcp.json`, not `claude mcp add`.**
  The latter writes to user scope and doesn't travel.

## This repo's `.claude/`

- `.claude/settings.json` — team plugin enablement (`enabledPlugins`)
  + the `anthropics-claude-code` marketplace under
  `extraKnownMarketplaces`. Adding more plugins later? Edit this file
  in a PR.
- No `rules/` yet. Add when there's something Claude should know every
  turn; otherwise write a skill.
- No `skills/`, `agents/`, `commands/` yet. Add under `.claude/skills/`
  when we need task-specific capabilities; follow the shape in
  `github.com/anthropics/skills`.

## Related

- **Context budget implications**: see `context-window.md`.
- **Plugin scoping**: see `plugins.md` (only `project` scope
  propagates to cloud).
